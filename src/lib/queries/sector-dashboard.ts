import { type SupabaseClient } from "@supabase/supabase-js";
import { type Company, type Sector, type SectorAverage } from "@/types/database";
import {
  computeProspectScoresBatch,
  type BulkScoringData,
  type ProspectScoreResult,
} from "@/lib/scoring";

// ── Types ──────────────────────────────────────────────────────────────

export interface CarrierData {
  id: string;
  ticker: string;
  name: string;
  sub_sector: string | null;
  metricsByYear: Record<number, Record<string, number | null>>;
  latest: Record<string, number | null>;
  prospectScore: number | null;
  scoreResult: ProspectScoreResult | null;
}

export interface SectorDashboardData {
  carriers: CarrierData[];
  years: number[];
  sectorMedians: Record<string, number>;
  sectorAverages: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** All metrics we might need across any sector dashboard. */
const ALL_METRICS = [
  "loss_ratio",
  "expense_ratio",
  "combined_ratio",
  "net_premiums_earned",
  "losses_incurred",
  "underwriting_expenses",
  "roe",
  "roa",
  "premium_growth_yoy",
  "debt_to_equity",
  "net_income",
  "revenue",
  "total_assets",
  "eps",
  "book_value_per_share",
  "investment_income",
  "acquisition_costs",
  "shares_outstanding",
  "medical_loss_ratio",
  "medical_claims_expense",
  "total_equity",
  "total_liabilities",
  "total_debt",
];

// ── Build from BulkScoringData (homepage, no extra DB calls) ───────────

export function buildSectorDashboardFromBulk(
  bulkScoringData: BulkScoringData,
  scoreResults: ProspectScoreResult[],
  sectorName: Sector
): SectorDashboardData {
  const sectorCompanies = bulkScoringData.companies.filter(
    (c) => c.sector === sectorName
  );

  const scoreMap = new Map<string, ProspectScoreResult>();
  for (const sr of scoreResults) {
    scoreMap.set(sr.companyId, sr);
  }

  // Build per-company, per-year metric maps from bulk timeseries
  const yearsSet = new Set<number>();
  const companyYearMetrics = new Map<
    string,
    Map<number, Map<string, number>>
  >();

  for (const c of sectorCompanies) {
    const companyTs = bulkScoringData.timeseries[c.id];
    if (!companyTs) continue;

    for (const metric of ALL_METRICS) {
      const entries = companyTs[metric];
      if (!entries) continue;
      for (const entry of entries) {
        yearsSet.add(entry.fiscal_year);
        if (!companyYearMetrics.has(c.id)) {
          companyYearMetrics.set(c.id, new Map());
        }
        const yearMap = companyYearMetrics.get(c.id)!;
        if (!yearMap.has(entry.fiscal_year)) {
          yearMap.set(entry.fiscal_year, new Map());
        }
        yearMap.get(entry.fiscal_year)!.set(metric, entry.value);
      }
    }

    // Also include latest metrics (some derived metrics only in latest, not timeseries)
    const latest = bulkScoringData.latestMetrics[c.id];
    if (latest) {
      for (const metric of ALL_METRICS) {
        if (latest[metric] == null) continue;
        const ts = companyTs[metric];
        const inferredYear = ts
          ? Math.max(...ts.map((e) => e.fiscal_year))
          : 2024;
        yearsSet.add(inferredYear);
        if (!companyYearMetrics.has(c.id)) {
          companyYearMetrics.set(c.id, new Map());
        }
        const yearMap = companyYearMetrics.get(c.id)!;
        if (!yearMap.has(inferredYear)) {
          yearMap.set(inferredYear, new Map());
        }
        if (!yearMap.get(inferredYear)!.has(metric)) {
          yearMap.get(inferredYear)!.set(metric, latest[metric]);
        }
      }
    }
  }

  // Filter years to those with sufficient data coverage (avoids phantom years
  // from e.g. a single company with spurious FY2025 data)
  const minCompaniesForYear = Math.max(2, Math.ceil(sectorCompanies.length * 0.25));
  const years = Array.from(yearsSet)
    .sort((a, b) => a - b)
    .filter((y) => {
      const companiesWithData = sectorCompanies.filter(
        (c) => companyYearMetrics.get(c.id)?.has(y)
      ).length;
      return companiesWithData >= minCompaniesForYear;
    });
  const latestYear = years[years.length - 1] ?? 2024;

  const carriers: CarrierData[] = sectorCompanies.map((c) => {
    const yearMap = companyYearMetrics.get(c.id) ?? new Map();

    const metricsByYear: Record<number, Record<string, number | null>> = {};
    for (const y of years) {
      const metrics = yearMap.get(y);
      if (!metrics) continue;
      const yearData: Record<string, number | null> = {};
      for (const [key, val] of metrics) {
        yearData[key] = val;
      }
      metricsByYear[y] = yearData;
    }

    const latest = metricsByYear[latestYear] ?? {};
    const sr = scoreMap.get(c.id) ?? null;

    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sub_sector: null as string | null,
      metricsByYear,
      latest,
      prospectScore: sr?.totalScore ?? null,
      scoreResult: sr,
    };
  });

  // Compute sector medians & averages for key metrics
  const sectorMedians: Record<string, number> = {};
  const sectorAvgs: Record<string, number> = {};

  for (const metric of ALL_METRICS) {
    const values = carriers
      .map((c) => c.latest[metric])
      .filter((v): v is number => v != null);
    if (values.length > 0) {
      sectorMedians[metric] = median(values);
      sectorAvgs[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  return {
    carriers,
    years,
    sectorMedians,
    sectorAverages: sectorAvgs,
  };
}

// ── Paginated fetch ────────────────────────────────────────────────────

async function paginatedFetch<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await queryFn(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allData;
}

// ── Direct DB fetch (sector detail pages) ──────────────────────────────

export async function fetchSectorDashboardData(
  supabase: SupabaseClient,
  companies: Company[],
  sectorAvgRows: SectorAverage[]
): Promise<SectorDashboardData> {
  const companyIds = companies.map((c) => c.id);

  const rows = await paginatedFetch<{
    company_id: string;
    metric_name: string;
    metric_value: number;
    fiscal_year: number;
  }>((from, to) =>
    supabase
      .from("financial_metrics")
      .select("company_id, metric_name, metric_value, fiscal_year")
      .in("company_id", companyIds)
      .in("metric_name", ALL_METRICS)
      .eq("period_type", "annual")
      .order("fiscal_year", { ascending: true })
      .range(from, to)
  );

  // Build per-company, per-year metric maps
  const companyMap = new Map<string, Map<number, Map<string, number>>>();
  const yearsSet = new Set<number>();

  for (const row of rows) {
    yearsSet.add(row.fiscal_year);
    if (!companyMap.has(row.company_id)) {
      companyMap.set(row.company_id, new Map());
    }
    const yearMap = companyMap.get(row.company_id)!;
    if (!yearMap.has(row.fiscal_year)) {
      yearMap.set(row.fiscal_year, new Map());
    }
    yearMap.get(row.fiscal_year)!.set(row.metric_name, row.metric_value);
  }

  // Filter years to those with sufficient data coverage
  const minCosForYear = Math.max(2, Math.ceil(companies.length * 0.25));
  const years = Array.from(yearsSet)
    .sort((a, b) => a - b)
    .filter((y) => {
      const cosWithData = companies.filter((c) => companyMap.get(c.id)?.has(y)).length;
      return cosWithData >= minCosForYear;
    });
  const latestYear = years[years.length - 1] ?? 2024;

  // Build scoring data for prospect scores
  const sectorAverages: BulkScoringData["sectorAverages"] = {};
  for (const row of sectorAvgRows) {
    if (!sectorAverages[row.sector]) sectorAverages[row.sector] = {};
    sectorAverages[row.sector][row.metric_name] = {
      avg: row.avg_value,
      min: row.min_value,
      max: row.max_value,
    };
  }

  // Also fetch all-sector averages for scoring
  const { data: allSectorAvgs } = await supabase
    .from("mv_sector_averages")
    .select("*");
  for (const row of (allSectorAvgs ?? []) as SectorAverage[]) {
    if (!sectorAverages[row.sector]) sectorAverages[row.sector] = {};
    sectorAverages[row.sector][row.metric_name] = {
      avg: row.avg_value,
      min: row.min_value,
      max: row.max_value,
    };
  }

  // Build timeseries & latest for scoring
  const timeseries: BulkScoringData["timeseries"] = {};
  for (const row of rows) {
    if (!timeseries[row.company_id]) timeseries[row.company_id] = {};
    if (!timeseries[row.company_id][row.metric_name]) {
      timeseries[row.company_id][row.metric_name] = [];
    }
    timeseries[row.company_id][row.metric_name].push({
      fiscal_year: row.fiscal_year,
      value: row.metric_value,
    });
  }

  const latestMetrics: Record<string, Record<string, number>> = {};
  for (const c of companies) {
    const yearMap = companyMap.get(c.id);
    if (!yearMap) continue;
    const latestData = yearMap.get(latestYear);
    if (!latestData) continue;
    latestMetrics[c.id] = Object.fromEntries(latestData);
  }

  // Compute prospect scores
  const scoringData: BulkScoringData = {
    companies: companies.map((c) => ({
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
    })),
    latestMetrics,
    sectorAverages,
    timeseries,
  };
  const scoreResults = computeProspectScoresBatch(scoringData);
  const scoreMap = new Map<string, ProspectScoreResult>();
  for (const sr of scoreResults) {
    scoreMap.set(sr.companyId, sr);
  }

  // Build carrier data
  const carriers: CarrierData[] = companies.map((c) => {
    const yearMap = companyMap.get(c.id) ?? new Map();

    const metricsByYear: Record<number, Record<string, number | null>> = {};
    for (const y of years) {
      const metrics = yearMap.get(y);
      if (!metrics) continue;
      const yearData: Record<string, number | null> = {};
      for (const [key, val] of metrics) {
        yearData[key] = val;
      }
      metricsByYear[y] = yearData;
    }

    const latest = metricsByYear[latestYear] ?? {};
    const sr = scoreMap.get(c.id) ?? null;

    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sub_sector: c.sub_sector,
      metricsByYear,
      latest,
      prospectScore: sr?.totalScore ?? null,
      scoreResult: sr,
    };
  });

  // Compute sector-level medians & averages
  const sectorMeds: Record<string, number> = {};
  const sectorAvgs2: Record<string, number> = {};

  for (const metric of ALL_METRICS) {
    const values = carriers
      .map((c) => c.latest[metric])
      .filter((v): v is number => v != null);
    if (values.length > 0) {
      sectorMeds[metric] = median(values);
      sectorAvgs2[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  return {
    carriers,
    years,
    sectorMedians: sectorMeds,
    sectorAverages: sectorAvgs2,
  };
}
