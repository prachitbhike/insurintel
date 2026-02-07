import { type SupabaseClient } from "@supabase/supabase-js";
import { type Company, type SectorAverage } from "@/types/database";
import {
  computeProspectScoresBatch,
  type BulkScoringData,
  type ProspectScoreResult,
} from "@/lib/scoring";

// ── Types ──────────────────────────────────────────────────────────────

export interface PCCarrierYear {
  loss_ratio: number | null;
  expense_ratio: number | null;
  combined_ratio: number | null;
  net_premiums_earned: number | null;
  losses_incurred: number | null;
  underwriting_expenses: number | null;
  roe: number | null;
  premium_growth_yoy: number | null;
  debt_to_equity: number | null;
  net_income: number | null;
  revenue: number | null;
  total_assets: number | null;
  eps: number | null;
  book_value_per_share: number | null;
  investment_income: number | null;
  acquisition_costs: number | null;
  roa: number | null;
  shares_outstanding: number | null;
}

export interface PCCarrierData {
  id: string;
  ticker: string;
  name: string;
  sub_sector: string | null;
  metricsByYear: Record<number, PCCarrierYear>;
  latest: PCCarrierYear;
  avgLossRatio: number | null;
  stdDevLossRatio: number | null;
  prospectScore: number | null;
  scoreResult: ProspectScoreResult | null;
}

export interface OpportunityMapItem {
  ticker: string;
  name: string;
  sub_sector: string | null;
  avgLossRatio: number;
  stdDevLossRatio: number;
  netPremiums: number;
  prospectScore: number | null;
}

export interface PCDashboardData {
  carriers: PCCarrierData[];
  opportunityMapItems: OpportunityMapItem[];
  sectorAvgLossRatio: number;
  sectorMedianCombined: number;
  sectorMedianExpenseRatio: number;
  years: number[];
}

// ── Helpers ────────────────────────────────────────────────────────────

const ALL_PC_METRICS = [
  "loss_ratio",
  "expense_ratio",
  "combined_ratio",
  "net_premiums_earned",
  "losses_incurred",
  "underwriting_expenses",
  "roe",
  "premium_growth_yoy",
  "debt_to_equity",
  "net_income",
  "revenue",
  "total_assets",
  "eps",
  "book_value_per_share",
  "investment_income",
  "acquisition_costs",
  "roa",
  "shares_outstanding",
];

function emptyYear(): PCCarrierYear {
  return {
    loss_ratio: null,
    expense_ratio: null,
    combined_ratio: null,
    net_premiums_earned: null,
    losses_incurred: null,
    underwriting_expenses: null,
    roe: null,
    premium_growth_yoy: null,
    debt_to_equity: null,
    net_income: null,
    revenue: null,
    total_assets: null,
    eps: null,
    book_value_per_share: null,
    investment_income: null,
    acquisition_costs: null,
    roa: null,
    shares_outstanding: null,
  };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiff = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiff.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Build from BulkScoringData (homepage, no extra DB calls) ───────────

export function buildPCDashboardFromBulk(
  bulkScoringData: BulkScoringData,
  scoreResults: ProspectScoreResult[]
): PCDashboardData {
  const pcCompanies = bulkScoringData.companies.filter(
    (c) => c.sector === "P&C"
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

  for (const c of pcCompanies) {
    const companyTs = bulkScoringData.timeseries[c.id];
    if (!companyTs) continue;

    for (const metric of ALL_PC_METRICS) {
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
      for (const metric of ALL_PC_METRICS) {
        if (latest[metric] == null) continue;
        // Find the latest year from timeseries to attach this to
        const ts = companyTs[metric];
        const latestYear = ts
          ? Math.max(...ts.map((e) => e.fiscal_year))
          : 2024;
        yearsSet.add(latestYear);
        if (!companyYearMetrics.has(c.id)) {
          companyYearMetrics.set(c.id, new Map());
        }
        const yearMap = companyYearMetrics.get(c.id)!;
        if (!yearMap.has(latestYear)) {
          yearMap.set(latestYear, new Map());
        }
        // Don't overwrite timeseries value
        if (!yearMap.get(latestYear)!.has(metric)) {
          yearMap.get(latestYear)!.set(metric, latest[metric]);
        }
      }
    }
  }

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const latestYear = years[years.length - 1] ?? 2024;

  const carriers: PCCarrierData[] = pcCompanies.map((c) => {
    const yearMap = companyYearMetrics.get(c.id) ?? new Map();

    const metricsByYear: Record<number, PCCarrierYear> = {};
    for (const y of years) {
      const metrics = yearMap.get(y);
      if (!metrics) continue;
      const yearData = emptyYear();
      for (const [key, val] of metrics) {
        if (key in yearData) {
          (yearData as unknown as Record<string, number | null>)[key] = val;
        }
      }
      metricsByYear[y] = yearData;
    }

    const latest = metricsByYear[latestYear] ?? emptyYear();

    const lossRatioValues = years
      .map((y) => metricsByYear[y]?.loss_ratio)
      .filter((v): v is number => v != null);

    const avgLossRatio =
      lossRatioValues.length >= 2
        ? lossRatioValues.reduce((a, b) => a + b, 0) / lossRatioValues.length
        : lossRatioValues.length === 1
          ? lossRatioValues[0]
          : null;

    const stdDevLossRatio =
      lossRatioValues.length >= 2 ? stdDev(lossRatioValues) : null;

    const sr = scoreMap.get(c.id) ?? null;

    // sub_sector not in BulkScoringData companies — use null
    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sub_sector: null as string | null,
      metricsByYear,
      latest,
      avgLossRatio,
      stdDevLossRatio,
      prospectScore: sr?.totalScore ?? null,
      scoreResult: sr,
    };
  });

  const opportunityMapItems: OpportunityMapItem[] = carriers
    .filter(
      (c) =>
        c.avgLossRatio != null &&
        c.stdDevLossRatio != null &&
        c.latest.net_premiums_earned != null &&
        c.latest.net_premiums_earned > 0
    )
    .map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sub_sector: c.sub_sector,
      avgLossRatio: c.avgLossRatio!,
      stdDevLossRatio: c.stdDevLossRatio!,
      netPremiums: c.latest.net_premiums_earned!,
      prospectScore: c.prospectScore,
    }));

  const allLossRatios = carriers
    .map((c) => c.avgLossRatio)
    .filter((v): v is number => v != null);
  const sectorAvgLossRatio =
    allLossRatios.length > 0
      ? allLossRatios.reduce((a, b) => a + b, 0) / allLossRatios.length
      : 65;

  const allCombinedRatios = carriers
    .map((c) => c.latest.combined_ratio)
    .filter((v): v is number => v != null);
  const sectorMedianCombined =
    allCombinedRatios.length > 0 ? median(allCombinedRatios) : 98;

  const allExpenseRatios = carriers
    .map((c) => c.latest.expense_ratio)
    .filter((v): v is number => v != null);
  const sectorMedianExpenseRatio =
    allExpenseRatios.length > 0 ? median(allExpenseRatios) : 30;

  return {
    carriers,
    opportunityMapItems,
    sectorAvgLossRatio,
    sectorMedianCombined,
    sectorMedianExpenseRatio,
    years,
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

// ── Main fetch ─────────────────────────────────────────────────────────

export async function fetchPCDashboardData(
  supabase: SupabaseClient,
  companies: Company[],
  sectorAvgRows: SectorAverage[]
): Promise<PCDashboardData> {
  const companyIds = companies.map((c) => c.id);

  // Fetch all annual financial metrics for P&C companies
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
      .in("metric_name", ALL_PC_METRICS)
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

  const years = Array.from(yearsSet).sort((a, b) => a - b);
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

  // Also fetch all-sector averages for scoring (scoring needs full context)
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

  // Build timeseries for scoring
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

  // Build latest metrics for scoring
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
  const carriers: PCCarrierData[] = companies.map((c) => {
    const yearMap = companyMap.get(c.id) ?? new Map();

    const metricsByYear: Record<number, PCCarrierYear> = {};
    for (const y of years) {
      const metrics = yearMap.get(y);
      if (!metrics) continue;
      const yearData = emptyYear();
      for (const [key, val] of metrics) {
        if (key in yearData) {
          (yearData as unknown as Record<string, number | null>)[key] = val;
        }
      }
      metricsByYear[y] = yearData;
    }

    // Latest year data
    const latest = metricsByYear[latestYear] ?? emptyYear();

    // Compute avg and stddev of loss ratio across available years
    const lossRatioValues = years
      .map((y) => metricsByYear[y]?.loss_ratio)
      .filter((v): v is number => v != null);

    const avgLossRatio =
      lossRatioValues.length >= 2
        ? lossRatioValues.reduce((a, b) => a + b, 0) / lossRatioValues.length
        : lossRatioValues.length === 1
          ? lossRatioValues[0]
          : null;

    const stdDevLossRatio =
      lossRatioValues.length >= 2 ? stdDev(lossRatioValues) : null;

    const sr = scoreMap.get(c.id) ?? null;

    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sub_sector: c.sub_sector,
      metricsByYear,
      latest,
      avgLossRatio,
      stdDevLossRatio,
      prospectScore: sr?.totalScore ?? null,
      scoreResult: sr,
    };
  });

  // Opportunity map items: exclude carriers with <2 years loss ratio data
  const opportunityMapItems: OpportunityMapItem[] = carriers
    .filter(
      (c) =>
        c.avgLossRatio != null &&
        c.stdDevLossRatio != null &&
        c.latest.net_premiums_earned != null &&
        c.latest.net_premiums_earned > 0
    )
    .map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sub_sector: c.sub_sector,
      avgLossRatio: c.avgLossRatio!,
      stdDevLossRatio: c.stdDevLossRatio!,
      netPremiums: c.latest.net_premiums_earned!,
      prospectScore: c.prospectScore,
    }));

  // Sector-level stats
  const allLossRatios = carriers
    .map((c) => c.avgLossRatio)
    .filter((v): v is number => v != null);
  const sectorAvgLossRatio =
    allLossRatios.length > 0
      ? allLossRatios.reduce((a, b) => a + b, 0) / allLossRatios.length
      : 65;

  const allCombinedRatios = carriers
    .map((c) => c.latest.combined_ratio)
    .filter((v): v is number => v != null);
  const sectorMedianCombined =
    allCombinedRatios.length > 0 ? median(allCombinedRatios) : 98;

  const allExpenseRatios = carriers
    .map((c) => c.latest.expense_ratio)
    .filter((v): v is number => v != null);
  const sectorMedianExpenseRatio =
    allExpenseRatios.length > 0 ? median(allExpenseRatios) : 30;

  return {
    carriers,
    opportunityMapItems,
    sectorAvgLossRatio,
    sectorMedianCombined,
    sectorMedianExpenseRatio,
    years,
  };
}
