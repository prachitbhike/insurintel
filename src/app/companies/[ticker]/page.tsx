import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompanyByTicker } from "@/lib/queries/companies";
import { getLatestMetrics, getMetricTimeseries, getCompanyFinancials } from "@/lib/queries/metrics";
import { getCompanyRankings } from "@/lib/queries/sectors";
import { getSectorAverages } from "@/lib/queries/sectors";
import { SectorBadge } from "@/components/dashboard/sector-badge";
import { KpiGrid } from "@/components/company-detail/kpi-grid";
import { MetricCharts } from "@/components/company-detail/metric-charts";
import { PeerComparison } from "@/components/company-detail/peer-comparison";
import { FinancialTable } from "@/components/company-detail/financial-table";
import { QuickTake } from "@/components/company-detail/quick-take";
import { FounderInsights } from "@/components/company-detail/founder-insights";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { computeProspectScore } from "@/lib/scoring/prospect-score";
import { generateFounderNarrative } from "@/lib/scoring/founder-narrative";
import { type KpiValue, type TimeseriesPoint, type PeerComparison as PeerComparisonType, type FinancialRow } from "@/types/company";
import { COMPANIES_SEED } from "@/lib/data/companies-seed";
import { type Sector, type SectorAverage } from "@/types/database";

const sectorTopBorder: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Life: "border-t-emerald-500",
  Health: "border-t-violet-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
};

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateStaticParams() {
  return COMPANIES_SEED.map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker).toUpperCase();
  const seed = COMPANIES_SEED.find((c) => c.ticker === decodedTicker);
  const name = seed?.name ?? decodedTicker;

  return {
    title: `${decodedTicker} - ${name}`,
    description: `Financial KPIs and metrics for ${name} (${decodedTicker}). View combined ratio, ROE, premiums, and more.`,
  };
}

function generateQuickTake(
  companyName: string,
  sector: string,
  comparisons: PeerComparisonType[],
  kpis: KpiValue[],
): string[] {
  const sentences: string[] = [];
  const validComparisons = comparisons.filter(
    (c) => c.company_value != null && c.sector_avg != null
  );

  if (validComparisons.length === 0) return sentences;

  // Score each metric by relative performance vs sector avg
  const scored = validComparisons.map((c) => {
    const def = METRIC_DEFINITIONS[c.metric_name];
    const diff = c.company_value! - c.sector_avg!;
    const absDiff = Math.abs(c.sector_avg!) > 0
      ? Math.abs(diff / c.sector_avg!) * 100
      : 0;
    const isBetter = def?.higher_is_better ? diff > 0 : diff < 0;
    return { ...c, def, absDiff, isBetter };
  });

  // Top strength
  const strengths = scored.filter((s) => s.isBetter).sort((a, b) => b.absDiff - a.absDiff);
  if (strengths.length > 0) {
    const s = strengths[0];
    const label = s.def?.label ?? s.metric_name.replace(/_/g, " ");
    sentences.push(
      `${companyName} leads its ${sector} peers with a ${label.toLowerCase()} of ${formatMetricValue(s.metric_name, s.company_value)}, vs the sector average of ${formatMetricValue(s.metric_name, s.sector_avg)}.`
    );
  }

  // Top weakness
  const weaknesses = scored.filter((s) => !s.isBetter).sort((a, b) => b.absDiff - a.absDiff);
  if (weaknesses.length > 0) {
    const w = weaknesses[0];
    const label = w.def?.label ?? w.metric_name.replace(/_/g, " ");
    const rankStr = w.rank != null && w.total != null ? `, ranking #${w.rank} of ${w.total}` : "";
    sentences.push(
      `Its ${label.toLowerCase()} of ${formatMetricValue(w.metric_name, w.company_value)} trails the sector average of ${formatMetricValue(w.metric_name, w.sector_avg)}${rankStr}.`
    );
  }

  // YoY trend from KPIs
  const kpisWithChange = kpis.filter(
    (k) => k.change_pct != null && Math.abs(k.change_pct) >= 1
  );
  if (kpisWithChange.length > 0) {
    const biggest = kpisWithChange.sort(
      (a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!)
    )[0];
    const def = METRIC_DEFINITIONS[biggest.metric_name];
    const label = def?.label ?? biggest.metric_name.replace(/_/g, " ");
    const direction = biggest.change_pct! > 0 ? "increased" : "decreased";
    sentences.push(
      `${label} has ${direction} ${Math.abs(biggest.change_pct!).toFixed(1)}% year-over-year.`
    );
  }

  return sentences;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker).toUpperCase();

  let company;
  let kpis: KpiValue[] = [];
  const timeseries: Record<string, TimeseriesPoint[]> = {};
  let peerComparisons: PeerComparisonType[] = [];
  let annualFinancials: FinancialRow[] = [];
  let quarterlyFinancials: FinancialRow[] = [];
  let financialYears: string[] = [];
  let quarterlyPeriods: string[] = [];
  let founderNarrative: ReturnType<typeof generateFounderNarrative> | null = null;
  let prospectScoreResult: ReturnType<typeof computeProspectScore> | null = null;

  try {
    const supabase = await createClient();
    company = await getCompanyByTicker(supabase, decodedTicker);

    if (!company) {
      notFound();
    }

    const [latestMetrics, tsData, rankings, sectorAvgs, annualData, quarterlyData] =
      await Promise.all([
        getLatestMetrics(supabase, company.id),
        getMetricTimeseries(supabase, company.id),
        getCompanyRankings(supabase, company.id),
        getSectorAverages(supabase, company.sector),
        getCompanyFinancials(supabase, company.id, "annual"),
        getCompanyFinancials(supabase, company.id, "quarterly"),
      ]);

    // Build KPIs with prior year comparison
    const metricsByName = new Map<string, typeof latestMetrics[0]>();
    for (const m of latestMetrics) {
      metricsByName.set(m.metric_name, m);
    }

    // Get prior year data for comparison (from annual financials, not quarterly MV)
    const priorYearData = new Map<string, number>();
    for (const d of annualData) {
      const latest = metricsByName.get(d.metric_name);
      if (latest && d.fiscal_year === latest.fiscal_year - 1) {
        priorYearData.set(d.metric_name, d.metric_value);
      }
    }

    kpis = latestMetrics.map((m) => {
      const prior = priorYearData.get(m.metric_name);
      let changePct: number | null = null;
      if (prior != null && prior !== 0) {
        changePct = ((m.metric_value - prior) / Math.abs(prior)) * 100;
      }
      return {
        metric_name: m.metric_name,
        current_value: m.metric_value,
        prior_value: prior ?? null,
        change_pct: changePct,
        unit: m.unit,
        fiscal_year: m.fiscal_year,
      };
    });

    // Build timeseries grouped by metric
    for (const ts of tsData) {
      if (!timeseries[ts.metric_name]) timeseries[ts.metric_name] = [];
      timeseries[ts.metric_name].push({
        fiscal_year: ts.fiscal_year,
        fiscal_quarter: ts.fiscal_quarter,
        value: ts.metric_value,
      });
    }

    // Build peer comparisons
    const sectorAvgMap = new Map(sectorAvgs.map((a) => [a.metric_name, a.avg_value]));
    const rankingMap = new Map(rankings.map((r) => [r.metric_name, r]));

    // Sector-aware peer comparison metrics
    const sectorMetricMap: Record<string, string[]> = {
      "P&C": ["combined_ratio", "loss_ratio", "expense_ratio", "roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share"],
      "Reinsurance": ["combined_ratio", "loss_ratio", "expense_ratio", "roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share"],
      "Health": ["medical_loss_ratio", "roe", "roa", "eps", "revenue", "net_income", "book_value_per_share", "debt_to_equity"],
      "Life": ["roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share", "investment_income", "debt_to_equity"],
      "Brokers": ["roe", "roa", "eps", "revenue", "net_income", "book_value_per_share", "debt_to_equity"],
    };
    const comparisonMetrics = sectorMetricMap[company.sector] ?? ["roe", "roa", "eps", "net_income", "book_value_per_share"];

    peerComparisons = comparisonMetrics
      .filter((m) => metricsByName.has(m))
      .map((m) => {
        const ranking = rankingMap.get(m);
        return {
          metric_name: m,
          company_value: metricsByName.get(m)?.metric_value ?? null,
          sector_avg: sectorAvgMap.get(m) ?? null,
          rank: ranking?.rank_in_sector ?? null,
          total: ranking?.total_in_sector ?? null,
        };
      });

    // Build financial table data
    const yearSet = new Set<number>();
    for (const d of annualData) yearSet.add(d.fiscal_year);
    financialYears = [...yearSet].sort((a, b) => b - a).map(String);

    const annualMap = new Map<string, Record<string, number | null>>();
    for (const d of annualData) {
      if (!annualMap.has(d.metric_name)) annualMap.set(d.metric_name, {});
      annualMap.get(d.metric_name)![String(d.fiscal_year)] = d.metric_value;
    }
    annualFinancials = [...annualMap.entries()].map(([name, values]) => ({
      metric_name: name,
      values,
      unit: "USD",
    }));

    const qMap = new Map<string, Record<string, number | null>>();
    const qYearSet = new Set<string>();
    for (const d of quarterlyData) {
      if (!qMap.has(d.metric_name)) qMap.set(d.metric_name, {});
      const key = `${d.fiscal_year} Q${d.fiscal_quarter}`;
      qMap.get(d.metric_name)![key] = d.metric_value;
      qYearSet.add(key);
    }
    quarterlyFinancials = [...qMap.entries()].map(([name, values]) => ({
      metric_name: name,
      values,
      unit: "USD",
    }));

    // Sort quarterly periods descending (e.g. "2024 Q4", "2024 Q3", ...)
    quarterlyPeriods = [...qYearSet].sort((a, b) => {
      const [aY, aQ] = a.split(" Q").map(Number);
      const [bY, bQ] = b.split(" Q").map(Number);
      return (bY * 10 + bQ) - (aY * 10 + aQ);
    });

    // Compute prospect score + founder narrative
    const metricsRecord: Record<string, number | null> = {};
    for (const [name, m] of metricsByName) metricsRecord[name] = m.metric_value;
    const sectorAvgsRecord: Record<string, number | null> = {};
    const sectorMinsRecord: Record<string, number | null> = {};
    const sectorMaxesRecord: Record<string, number | null> = {};
    for (const avg of sectorAvgs as SectorAverage[]) {
      sectorAvgsRecord[avg.metric_name] = avg.avg_value;
      sectorMinsRecord[avg.metric_name] = avg.min_value;
      sectorMaxesRecord[avg.metric_name] = avg.max_value;
    }
    const tsForScoring: Record<string, { fiscal_year: number; value: number }[]> = {};
    for (const d of annualData) {
      if (!tsForScoring[d.metric_name]) tsForScoring[d.metric_name] = [];
      tsForScoring[d.metric_name].push({ fiscal_year: d.fiscal_year, value: d.metric_value });
    }
    prospectScoreResult = computeProspectScore({
      companyId: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector as Sector,
      metrics: metricsRecord,
      sectorAverages: sectorAvgsRecord,
      sectorMins: sectorMinsRecord,
      sectorMaxes: sectorMaxesRecord,
      timeseries: tsForScoring,
    });
    founderNarrative = generateFounderNarrative({
      companyName: company.name,
      ticker: company.ticker,
      sector: company.sector as Sector,
      metrics: metricsRecord,
      sectorAverages: sectorAvgsRecord,
      prospectScore: prospectScoreResult,
    });
  } catch {
    const seed = COMPANIES_SEED.find((c) => c.ticker === decodedTicker);
    if (!seed) notFound();
    company = {
      id: "",
      cik: seed.cik,
      ticker: seed.ticker,
      name: seed.name,
      sector: seed.sector,
      sub_sector: seed.sub_sector,
      entity_name: null,
      market_cap_bucket: null,
      sic_code: seed.sic_code,
      is_active: true,
      last_ingested_at: null,
      created_at: "",
      updated_at: "",
    };
  }

  const quickTakeSentences = generateQuickTake(
    company.name,
    company.sector,
    peerComparisons,
    kpis,
  );

  return (
    <div className={`container space-y-10 px-4 py-8 md:px-6 border-t-[3px] ${sectorTopBorder[company.sector as Sector] ?? ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-display tracking-tight">
              {company.ticker}
            </h1>
            <SectorBadge sector={company.sector} />
          </div>
          <p className="mt-1 text-muted-foreground">
            {company.name}
            {company.entity_name && company.entity_name !== company.name && (
              <span className="ml-1 text-xs">({company.entity_name})</span>
            )}
          </p>
        </div>
        <Link
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K&dateb=&owner=include&count=10`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          SEC Filings
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="animate-fade-up delay-1">
        <QuickTake sentences={quickTakeSentences} />
      </div>

      {founderNarrative && (
        <div className="animate-fade-up delay-1">
          <FounderInsights
            narrative={founderNarrative}
            prospectScore={prospectScoreResult?.totalScore ?? null}
          />
        </div>
      )}

      <div className="animate-fade-up delay-2">
        <KpiGrid kpis={kpis} sector={company.sector} />
      </div>

      <div className="animate-fade-up delay-3">
        <PeerComparison comparisons={peerComparisons} ticker={company.ticker} />
      </div>

      <div className="animate-fade-up delay-4">
        <MetricCharts timeseries={timeseries} sector={company.sector} />
      </div>

      <div className="animate-fade-up delay-5 grid gap-6 lg:grid-cols-1">
        <FinancialTable
          annualData={annualFinancials}
          quarterlyData={quarterlyFinancials}
          years={financialYears}
          quarterlyPeriods={quarterlyPeriods}
        />
      </div>
    </div>
  );
}
