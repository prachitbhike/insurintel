import { createClient } from "@/lib/supabase/server";
import { getBulkScoringData, getQuarterlyTimeseries } from "@/lib/queries/metrics";
import { computeProspectScoresBatch } from "@/lib/scoring";
import { computeBuyerSignals } from "@/lib/analysis/buyer-signals";
import { generateFounderNarrative } from "@/lib/scoring/founder-narrative";
import { interpretMetric, type InterpretContext } from "@/lib/metrics/interpret";
import { type HeroMetric } from "@/components/dashboard/hero-benchmarks-v2";
import { type TopProspect } from "@/components/dashboard/top-prospects-section";
import { getSectorBySlug, SECTORS, type SectorInfo } from "@/lib/data/sectors";
import { SectorDashboard } from "@/components/dashboard/sector-dashboard";
import { type Sector } from "@/types/database";
import { type SectorTrendData } from "@/components/sectors/sector-trend-charts";
import { type BulkScoringData } from "@/lib/scoring/types";
import { buildPCDashboardFromBulk } from "@/lib/queries/pc-dashboard";

export const revalidate = 3600;

async function getOverviewData() {
  try {
    const supabase = await createClient();
    const bulkScoringData = await getBulkScoringData(supabase);

    // Fetch quarterly timeseries for all companies and key metrics
    const allCompanyIds = bulkScoringData.companies.map((c) => c.id);
    const allKeyMetrics = [
      ...new Set(SECTORS.flatMap((s) => s.key_metrics)),
    ];
    const quarterlyRows = await getQuarterlyTimeseries(
      supabase,
      allCompanyIds,
      allKeyMetrics
    );

    // Compute prospect scores
    const scores = computeProspectScoresBatch(bulkScoringData);
    const scoreMap = new Map(scores.map((s) => [s.companyId, s]));

    // Compute buyer signals
    const buyerSignals = computeBuyerSignals(bulkScoringData, scores);
    const signalMap = new Map(buyerSignals.map((s) => [s.companyId, s]));

    return {
      bulkScoringData,
      quarterlyRows,
      scores,
      scoreMap,
      signalMap,
    };
  } catch (error) {
    console.error("[HomePage] Failed to load overview data:", error);
    return {
      bulkScoringData: null,
      quarterlyRows: [],
      scores: [],
      scoreMap: new Map(),
      signalMap: new Map(),
    };
  }
}

function buildSectorHeroMetrics(
  sector: SectorInfo,
  companies: { id: string; ticker: string; name: string; sector: string }[],
  latestMetrics: Record<string, Record<string, number>>,
  timeseries: Record<string, Record<string, { fiscal_year: number; value: number }[]>>
): HeroMetric[] {
  const sectorCompanies = companies.filter((c) => c.sector === sector.name);

  return sector.hero_stats.map((stat) => {
    const values: number[] = [];
    for (const c of sectorCompanies) {
      const v = latestMetrics[c.id]?.[stat.metricName];
      if (v != null) values.push(v);
    }

    let current: number | null = null;
    let annotation: string | undefined;

    if (stat.aggregation === "sum") {
      current = values.length > 0 ? values.reduce((s, v) => s + v, 0) : null;
    } else if (stat.aggregation === "avg") {
      current = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
    } else if (stat.aggregation === "spread") {
      if (values.length >= 2) {
        const spread = Math.max(...values) - Math.min(...values);
        current = spread;
        annotation = `${spread.toFixed(1)}pp best-to-worst`;
      }
    }

    // Compute prior year value
    let prior: number | null = null;
    if (stat.aggregation === "sum") {
      const yearValues = new Map<number, number>();
      for (const c of sectorCompanies) {
        const ts = timeseries[c.id]?.[stat.metricName];
        if (!ts) continue;
        for (const entry of ts) {
          yearValues.set(entry.fiscal_year, (yearValues.get(entry.fiscal_year) ?? 0) + entry.value);
        }
      }
      const sorted = Array.from(yearValues.entries()).sort((a, b) => b[0] - a[0]);
      prior = sorted.length >= 2 ? sorted[1][1] : null;
    } else if (stat.aggregation === "avg") {
      const priorValues: number[] = [];
      for (const c of sectorCompanies) {
        const ts = timeseries[c.id]?.[stat.metricName];
        if (!ts || ts.length < 2) continue;
        const sorted = [...ts].sort((a, b) => b.fiscal_year - a.fiscal_year);
        if (sorted.length >= 2) priorValues.push(sorted[1].value);
      }
      prior = priorValues.length > 0
        ? priorValues.reduce((s, v) => s + v, 0) / priorValues.length
        : null;
    }

    return {
      label: stat.title,
      metricName: stat.metricName,
      current,
      prior,
      deltaAbs: null,
      sparkline: [],
      tooltip: stat.tooltip,
      annotation,
    };
  });
}

/**
 * Builds SectorTrendData from bulkScoringData.timeseries (annual data from financial_metrics).
 * This is reliable data already fetched by getBulkScoringData — no row limit issues.
 */
function buildSectorTrendData(
  bulkScoringData: BulkScoringData,
  sectorName: Sector,
  metricNames: string[],
): { trendData: SectorTrendData; tickers: string[] } {
  const trendData: SectorTrendData = {};

  // Get sector companies and build ticker lookup
  const sectorCompanies = bulkScoringData.companies
    .filter((c) => c.sector === sectorName)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  const tickers = sectorCompanies.map((c) => c.ticker);

  for (const metric of metricNames) {
    // Collect all (year, ticker, value) tuples for this metric
    const yearMap = new Map<number, Map<string, number>>();

    for (const company of sectorCompanies) {
      const ts = bulkScoringData.timeseries[company.id]?.[metric];
      if (!ts) continue;
      for (const entry of ts) {
        if (!yearMap.has(entry.fiscal_year)) yearMap.set(entry.fiscal_year, new Map());
        yearMap.get(entry.fiscal_year)!.set(company.ticker, entry.value);
      }
    }

    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    if (years.length > 0) {
      trendData[metric] = years.map((year) => {
        const tickerVals = yearMap.get(year)!;
        const entry: Record<string, string | number | null> = { period: String(year) };
        for (const t of tickers) entry[t] = tickerVals.get(t) ?? null;
        return entry as { period: string; [ticker: string]: string | number | null };
      });
    }
  }

  return { trendData, tickers };
}

type QuarterlyRow = {
  company_id: string;
  ticker: string;
  metric_name: string;
  metric_value: number;
  fiscal_year: number;
  fiscal_quarter: number;
};

function buildQuarterlyTrendData(
  quarterlyRows: QuarterlyRow[],
  companies: { id: string; ticker: string; sector: string }[],
  sectorName: Sector,
  metricNames: string[]
): { trendData: SectorTrendData; tickers: string[] } {
  const sectorCompanies = companies
    .filter((c) => c.sector === sectorName)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  const tickers = sectorCompanies.map((c) => c.ticker);
  const tickerById = new Map(sectorCompanies.map((c) => [c.id, c.ticker]));
  const trendData: SectorTrendData = {};

  for (const metric of metricNames) {
    const periodMap = new Map<string, Map<string, number>>();
    for (const row of quarterlyRows) {
      if (row.metric_name !== metric) continue;
      const ticker = tickerById.get(row.company_id);
      if (!ticker) continue;
      const periodKey = `${row.fiscal_year} Q${row.fiscal_quarter}`;
      if (!periodMap.has(periodKey)) periodMap.set(periodKey, new Map());
      periodMap.get(periodKey)!.set(ticker, row.metric_value);
    }
    // Sort periods chronologically
    const periods = Array.from(periodMap.keys()).sort((a, b) => {
      const [aY, aQ] = a.split(" Q").map(Number);
      const [bY, bQ] = b.split(" Q").map(Number);
      return aY * 10 + aQ - (bY * 10 + bQ);
    });
    if (periods.length > 0) {
      trendData[metric] = periods.map((period) => {
        const tickerVals = periodMap.get(period)!;
        const entry: Record<string, string | number | null> = { period };
        for (const t of tickers) entry[t] = tickerVals.get(t) ?? null;
        return entry as { period: string; [ticker: string]: string | number | null };
      });
    }
  }
  return { trendData, tickers };
}

interface HomePageProps {
  searchParams: Promise<{ sector?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const sectorSlug = params.sector ?? "p-and-c";
  const activeSector = getSectorBySlug(sectorSlug) ?? null;

  const data = await getOverviewData();

  if (!activeSector || !data.bulkScoringData) {
    return <div className="container px-4 py-20 text-center text-muted-foreground">Loading sector data...</div>;
  }

  const { bulkScoringData, quarterlyRows, scores, signalMap } = data;
  const { companies: allCompanies, latestMetrics, sectorAverages } = bulkScoringData;

  // Build sector-specific hero metrics (KPI strip)
  const sectorHeroMetrics = buildSectorHeroMetrics(
    activeSector,
    allCompanies,
    latestMetrics,
    bulkScoringData.timeseries
  );

  // Filter top prospects to sector
  const sectorTopProspects = [...scores]
    .filter((s) => s.totalScore != null && s.sector === activeSector.name)
    .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
    .slice(0, 6)
    .map((s) => {
      const companyMetrics = latestMetrics[s.companyId] ?? {};
      const sectorAvgs = sectorAverages[s.sector] ?? {};
      const sectorAvgRecord: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(sectorAvgs)) {
        sectorAvgRecord[k] = v.avg;
      }

      const narrative = generateFounderNarrative({
        companyName: s.name,
        ticker: s.ticker,
        sector: s.sector,
        metrics: companyMetrics as Record<string, number | null>,
        sectorAverages: sectorAvgRecord,
        prospectScore: s,
      });

      const signal = signalMap.get(s.companyId);
      const premiumBase = companyMetrics.net_premiums_earned ?? companyMetrics.revenue ?? null;
      let dollarImpact: string | null = null;
      if (s.painMetricName && companyMetrics[s.painMetricName] != null && premiumBase) {
        const avgData = sectorAvgs[s.painMetricName];
        const ctx: InterpretContext = {
          sector: s.sector,
          sectorAvg: avgData?.avg ?? null,
          sectorMin: avgData?.min ?? null,
          sectorMax: avgData?.max ?? null,
          rank: null,
          totalInSector: null,
          premiumBase,
        };
        const interp = interpretMetric(s.painMetricName, companyMetrics[s.painMetricName], ctx);
        if (interp?.dollarImpact) {
          dollarImpact = interp.dollarImpact;
        }
      }

      return {
        companyId: s.companyId,
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        prospectScore: s.totalScore,
        hookSentence: narrative.hookSentence,
        dollarImpact,
        signalLine: signal?.signalDescription ?? null,
      } satisfies TopProspect;
    });

  // Build sector trend data from bulkScoringData (annual timeseries from financial_metrics)
  const { trendData: sectorTrendData, tickers: sectorTickers } =
    buildSectorTrendData(bulkScoringData, activeSector.name, activeSector.key_metrics);

  // Build quarterly trend data from mv_metric_timeseries
  const { trendData: quarterlyTrendData } = buildQuarterlyTrendData(
    quarterlyRows,
    allCompanies,
    activeSector.name,
    activeSector.key_metrics
  );

  // Build P&C Market Pulse dashboard data if active sector is P&C
  const pcDashboardData =
    activeSector.name === "P&C"
      ? buildPCDashboardFromBulk(bulkScoringData, scores)
      : null;

  return (
    <SectorDashboard
      sector={activeSector}
      heroMetrics={sectorHeroMetrics}
      topProspects={sectorTopProspects}
      sectorTrendData={sectorTrendData}
      quarterlyTrendData={quarterlyTrendData}
      sectorTickers={sectorTickers}
      pcDashboardData={pcDashboardData}
    />
  );
}
