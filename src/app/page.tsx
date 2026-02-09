import { getBulkScoringData, preloadBulkScoringData } from "@/lib/queries/metrics";
import { computeProspectScoresBatch } from "@/lib/scoring";
import { type HeroMetric } from "@/components/dashboard/hero-benchmarks-v2";
import { getSectorBySlug, type SectorInfo } from "@/lib/data/sectors";
import { SectorDashboard } from "@/components/dashboard/sector-dashboard";
import { buildSectorDashboardFromBulk } from "@/lib/queries/sector-dashboard";

export const revalidate = 3600;

async function getOverviewData() {
  try {
    const bulkScoringData = await getBulkScoringData();

    // Compute prospect scores
    const scores = computeProspectScoresBatch(bulkScoringData);

    return {
      bulkScoringData,
      scores,
    };
  } catch (error) {
    console.error("[HomePage] Failed to load overview data:", error);
    return {
      bulkScoringData: null,
      scores: [],
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

interface HomePageProps {
  searchParams: Promise<{ sector?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  preloadBulkScoringData();

  const params = await searchParams;
  const sectorSlug = params.sector ?? "p-and-c";
  const activeSector = getSectorBySlug(sectorSlug) ?? null;

  const data = await getOverviewData();

  if (!activeSector || !data.bulkScoringData) {
    return <div className="container px-4 py-20 text-center text-muted-foreground">Loading sector data...</div>;
  }

  const { bulkScoringData, scores } = data;
  const { companies: allCompanies, latestMetrics } = bulkScoringData;

  // Build sector-specific hero metrics (KPI strip)
  const sectorHeroMetrics = buildSectorHeroMetrics(
    activeSector,
    allCompanies,
    latestMetrics,
    bulkScoringData.timeseries
  );

  // Build Market Pulse dashboard data for the active sector
  const sectorDashboardData = buildSectorDashboardFromBulk(
    bulkScoringData,
    scores,
    activeSector.name
  );

  return (
    <SectorDashboard
      sector={activeSector}
      heroMetrics={sectorHeroMetrics}
      sectorDashboardData={sectorDashboardData}
    />
  );
}
