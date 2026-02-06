import { createClient } from "@/lib/supabase/server";
import { getBulkScoringData, getIndustryTimeseries } from "@/lib/queries/metrics";
import { computeProspectScoresBatch } from "@/lib/scoring";
import { computeBuyerSignals } from "@/lib/analysis/buyer-signals";
import { generateFounderNarrative } from "@/lib/scoring/founder-narrative";
import { interpretMetric, type InterpretContext } from "@/lib/metrics/interpret";
import { type HeroMetric } from "@/components/dashboard/hero-benchmarks-v2";
import { type TopProspect } from "@/components/dashboard/top-prospects-section";
import {
  type DisruptionTarget,
} from "@/components/dashboard/disruption-targets-table";
import { extractCompanyTimeseries } from "@/lib/metrics/aggregations";
import { getSectorBySlug, type SectorInfo } from "@/lib/data/sectors";
import { SectorDashboard } from "@/components/dashboard/sector-dashboard";
import { getSectorStoryMetric } from "@/lib/data/sector-story-config";
import { type HeroChartData } from "@/components/dashboard/sector-hero-chart";
import { type Sector } from "@/types/database";

export const revalidate = 3600;

const SPARKLINE_EXTRA_METRICS = [
  "combined_ratio",
  "expense_ratio",
  "premium_growth_yoy",
  "roe",
  "medical_loss_ratio",
  "net_premiums_earned",
];

async function getOverviewData() {
  try {
    const supabase = await createClient();

    const [bulkScoringData, industryTimeseries] =
      await Promise.all([
        getBulkScoringData(supabase),
        getIndustryTimeseries(supabase, SPARKLINE_EXTRA_METRICS),
      ]);

    // Compute prospect scores
    const scores = computeProspectScoresBatch(bulkScoringData);
    const scoreMap = new Map(scores.map((s) => [s.companyId, s]));

    // Compute buyer signals
    const buyerSignals = computeBuyerSignals(bulkScoringData, scores);
    const signalMap = new Map(buyerSignals.map((s) => [s.companyId, s]));

    const allCompanies = bulkScoringData.companies;
    const latestMetrics = bulkScoringData.latestMetrics;

    // Build disruption targets from ALL companies with sector-appropriate metrics
    const trendMetricForSector = (sector: string) => {
      if (sector === "P&C" || sector === "Reinsurance") return "combined_ratio";
      if (sector === "Health") return "medical_loss_ratio";
      return "roe";
    };

    const bestExpenseRatio = allCompanies.reduce((best, c) => {
      const er = latestMetrics[c.id]?.expense_ratio;
      return er != null && (best == null || er < best) ? er : best;
    }, null as number | null);

    const disruptionTargets: DisruptionTarget[] = allCompanies
      .map((c) => {
        const metrics = latestMetrics[c.id] ?? {};
        const expenseVal = metrics.expense_ratio ?? null;
        const premiumVal = metrics.net_premiums_earned ?? null;
        const roeVal = metrics.roe ?? null;
        const trend = extractCompanyTimeseries(
          industryTimeseries,
          trendMetricForSector(c.sector),
          c.id
        );
        const automationSavings =
          expenseVal != null && premiumVal != null && bestExpenseRatio != null && expenseVal > bestExpenseRatio
            ? ((expenseVal - bestExpenseRatio) / 100) * premiumVal
            : null;

        const score = scoreMap.get(c.id);
        const signal = signalMap.get(c.id);

        return {
          companyId: c.id,
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          combinedRatio: metrics.combined_ratio ?? null,
          expenseRatio: expenseVal,
          roe: roeVal,
          automationSavings,
          trend,
          prospectScore: score?.totalScore ?? null,
          signalTag: signal?.signalDescription ?? null,
          mlr: metrics.medical_loss_ratio ?? null,
          debtToEquity: metrics.debt_to_equity ?? null,
          revenue: metrics.revenue ?? null,
          netIncome: metrics.net_income ?? null,
          totalAssets: metrics.total_assets ?? null,
        };
      });

    return {
      disruptionTargets,
      bulkScoringData,
      scores,
      scoreMap,
      signalMap,
    };
  } catch {
    return {
      disruptionTargets: [],
      bulkScoringData: null,
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

function buildHeroChartData(
  sector: SectorInfo,
  sectorCompanies: { id: string; ticker: string; name: string; sector: Sector }[],
  latestMetrics: Record<string, Record<string, number>>,
  scoreMap: Map<string, { totalScore: number | null }>,
): HeroChartData {
  const sectorName = sector.name;

  if (sectorName === "P&C" || sectorName === "Reinsurance") {
    // Combined ratio breakeven data (also used for Re radar fallback bars)
    const items = sectorCompanies
      .map((c) => ({
        ticker: c.ticker,
        name: c.name,
        combinedRatio: latestMetrics[c.id]?.combined_ratio ?? null,
        score: scoreMap.get(c.id)?.totalScore ?? null,
      }))
      .filter((d): d is typeof d & { combinedRatio: number } => d.combinedRatio != null)
      .sort((a, b) => b.combinedRatio - a.combinedRatio);

    const avg =
      items.length > 0
        ? items.reduce((s, d) => s + d.combinedRatio, 0) / items.length
        : null;

    if (sectorName === "Reinsurance") {
      // Build radar data for reinsurance
      const radarItems = sectorCompanies
        .map((c) => {
          const m = latestMetrics[c.id] ?? {};
          return {
            ticker: c.ticker,
            name: c.name,
            combinedRatio: m.combined_ratio ?? null,
            lossRatio: m.loss_ratio ?? null,
            expenseRatio: m.expense_ratio ?? null,
            roe: m.roe ?? null,
            premiumGrowth: m.premium_growth_yoy ?? null,
          };
        })
        .filter((d) => d.combinedRatio != null || d.roe != null);

      return {
        type: "reinsurance-radar",
        data: radarItems,
      };
    }

    return {
      type: "pc-breakeven",
      data: items,
      sectorAvg: avg,
    };
  }

  if (sectorName === "Health") {
    const items = sectorCompanies
      .map((c) => ({
        ticker: c.ticker,
        name: c.name,
        mlr: latestMetrics[c.id]?.medical_loss_ratio ?? null,
        adminMargin: latestMetrics[c.id]?.medical_loss_ratio != null
          ? 100 - latestMetrics[c.id].medical_loss_ratio
          : null,
        revenue: latestMetrics[c.id]?.revenue ?? null,
      }))
      .filter((d): d is typeof d & { mlr: number; adminMargin: number } => d.mlr != null)
      .sort((a, b) => a.adminMargin - b.adminMargin); // Thinnest margin first
    return { type: "health-margin", data: items };
  }

  if (sectorName === "Life") {
    const items = sectorCompanies
      .map((c) => {
        const m = latestMetrics[c.id] ?? {};
        return {
          ticker: c.ticker,
          name: c.name,
          totalAssets: m.total_assets ?? null,
          roe: m.roe ?? null,
          netIncome: m.net_income ?? null,
          score: scoreMap.get(c.id)?.totalScore ?? null,
        };
      })
      .filter((d): d is typeof d & { totalAssets: number; roe: number } =>
        d.totalAssets != null && d.roe != null);

    const avgAssets = items.length > 0
      ? items.reduce((s, d) => s + d.totalAssets, 0) / items.length : 0;
    const avgRoe = items.length > 0
      ? items.reduce((s, d) => s + d.roe, 0) / items.length : 0;

    return { type: "life-bubble", data: items, avgAssets, avgRoe };
  }

  // Brokers
  const items = sectorCompanies
    .map((c) => {
      const m = latestMetrics[c.id] ?? {};
      return {
        ticker: c.ticker,
        name: c.name,
        debtToEquity: m.debt_to_equity ?? null,
        roe: m.roe ?? null,
        revenue: m.revenue ?? null,
      };
    })
    .filter((d): d is typeof d & { debtToEquity: number } => d.debtToEquity != null)
    .sort((a, b) => b.debtToEquity - a.debtToEquity);

  const avgDE = items.length > 0
    ? items.reduce((s, d) => s + d.debtToEquity, 0) / items.length : null;
  const roeValues = items.filter((d) => d.roe != null).map((d) => d.roe!);
  const avgROE = roeValues.length > 0
    ? roeValues.reduce((s, v) => s + v, 0) / roeValues.length : null;

  return { type: "broker-leverage", data: items, avgDE, avgROE };
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

  const { bulkScoringData, scores, scoreMap, signalMap } = data;
  const { companies: allCompanies, latestMetrics, sectorAverages } = bulkScoringData;

  // Build sector-specific hero metrics
  const sectorHeroMetrics = buildSectorHeroMetrics(
    activeSector,
    allCompanies,
    latestMetrics,
    bulkScoringData.timeseries
  );

  // Build story chart data
  const storyMetric = getSectorStoryMetric(activeSector.name);
  const sectorCompanies = allCompanies.filter((c) => c.sector === activeSector.name);
  const storyChartData = sectorCompanies
    .map((c) => ({
      ticker: c.ticker,
      value: latestMetrics[c.id]?.[storyMetric] ?? null,
    }))
    .filter((d): d is { ticker: string; value: number } => d.value != null);

  const storyChartAvg = sectorAverages[activeSector.name]?.[storyMetric]?.avg ?? null;

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

  // Filter disruption targets to sector and sort by sector-appropriate metric
  const sectorDisruptionTargets = data.disruptionTargets
    .filter((t) => t.sector === activeSector.name)
    .sort((a, b) => {
      const sn = activeSector.name;
      if (sn === "P&C" || sn === "Reinsurance")
        return (b.combinedRatio ?? -Infinity) - (a.combinedRatio ?? -Infinity);
      if (sn === "Health")
        return (b.mlr ?? -Infinity) - (a.mlr ?? -Infinity);
      if (sn === "Brokers")
        return (b.debtToEquity ?? -Infinity) - (a.debtToEquity ?? -Infinity);
      // Life: lowest ROE first
      return (a.roe ?? Infinity) - (b.roe ?? Infinity);
    });

  // Build hero chart data per sector
  const heroChartData = buildHeroChartData(activeSector, sectorCompanies, latestMetrics, scoreMap);

  return (
    <SectorDashboard
      sector={activeSector}
      heroMetrics={sectorHeroMetrics}
      topProspects={sectorTopProspects}
      disruptionTargets={sectorDisruptionTargets}
      storyChartData={storyChartData}
      storyChartAvg={storyChartAvg}
      heroChartData={heroChartData}
    />
  );
}
