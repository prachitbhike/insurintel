import { type SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  type LatestMetric,
  type MetricTimeseries,
  type IndustryTimeseriesRow,
  type SectorAverage,
  type Sector,
} from "@/types/database";
import { type BulkScoringData } from "@/lib/scoring/types";
import { getReadOnlyClient } from "@/lib/supabase/server";

/**
 * Paginated fetch to work around Supabase's default 1000-row limit.
 * Calls queryFn with (from, to) range offsets and concatenates results.
 */
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

export const getLatestMetrics = cache(async (
  supabase: SupabaseClient,
  companyId?: string
): Promise<LatestMetric[]> => {
  let query = supabase.from("mv_latest_metrics").select("*");
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
});

export async function getMetricTimeseries(
  supabase: SupabaseClient,
  companyId: string,
  metricNames?: string[]
): Promise<MetricTimeseries[]> {
  let query = supabase
    .from("mv_metric_timeseries")
    .select("*")
    .eq("company_id", companyId)
    .order("fiscal_year", { ascending: true })
    .order("fiscal_quarter", { ascending: true });

  if (metricNames && metricNames.length > 0) {
    query = query.in("metric_name", metricNames);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCompanyFinancials(
  supabase: SupabaseClient,
  companyId: string,
  periodType: "annual" | "quarterly" = "annual"
): Promise<
  {
    metric_name: string;
    metric_value: number;
    unit: string;
    fiscal_year: number;
    fiscal_quarter: number | null;
  }[]
> {
  // Query financial_metrics base table (mv_metric_timeseries is quarterly-only)
  let query = supabase
    .from("financial_metrics")
    .select("metric_name, metric_value, unit, fiscal_year, fiscal_quarter")
    .eq("company_id", companyId)
    .order("fiscal_year", { ascending: false })
    .order("metric_name");

  if (periodType === "annual") {
    query = query.eq("period_type", "annual");
  } else {
    query = query.eq("period_type", "quarterly");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLatestMetricsForCompanies(
  supabase: SupabaseClient,
  companyIds: string[],
  metricNames: string[]
): Promise<LatestMetric[]> {
  const { data, error } = await supabase
    .from("mv_latest_metrics")
    .select("*")
    .in("company_id", companyIds)
    .in("metric_name", metricNames);

  if (error) throw error;
  return data ?? [];
}

export async function getIndustryTimeseries(
  supabase: SupabaseClient,
  metricNames: string[]
): Promise<IndustryTimeseriesRow[]> {
  const [timeseriesData, companiesRes] = await Promise.all([
    paginatedFetch<{
      company_id: string;
      ticker: string;
      metric_name: string;
      metric_value: number;
      fiscal_year: number;
      fiscal_quarter: number;
    }>((from, to) =>
      supabase
        .from("mv_metric_timeseries")
        .select("company_id, ticker, metric_name, metric_value, fiscal_year, fiscal_quarter")
        .in("metric_name", metricNames)
        .order("fiscal_year", { ascending: true })
        .order("fiscal_quarter", { ascending: true })
        .range(from, to)
    ),
    supabase.from("companies").select("id, sector"),
  ]);

  if (companiesRes.error) throw companiesRes.error;

  const sectorMap = new Map<string, Sector>();
  for (const c of companiesRes.data ?? []) {
    sectorMap.set(c.id, c.sector as Sector);
  }

  return timeseriesData.map((row) => ({
    ...row,
    sector: sectorMap.get(row.company_id) ?? ("P&C" as Sector),
  }));
}

export async function getQuarterlyTimeseries(
  supabase: SupabaseClient,
  companyIds: string[],
  metricNames: string[]
): Promise<
  {
    company_id: string;
    ticker: string;
    metric_name: string;
    metric_value: number;
    fiscal_year: number;
    fiscal_quarter: number;
  }[]
> {
  return paginatedFetch((from, to) =>
    supabase
      .from("mv_metric_timeseries")
      .select(
        "company_id, ticker, metric_name, metric_value, fiscal_year, fiscal_quarter"
      )
      .in("company_id", companyIds)
      .in("metric_name", metricNames)
      .order("fiscal_year", { ascending: true })
      .order("fiscal_quarter", { ascending: true })
      .range(from, to)
  );
}

/**
 * Fetch latest metrics for all companies in a sector, filtered by metric names.
 * Used for radar chart peer comparison on company detail pages.
 */
export async function getSectorPeerMetrics(
  supabase: SupabaseClient,
  sector: Sector,
  metricNames: string[],
): Promise<
  {
    company_id: string;
    ticker: string;
    name: string;
    metric_name: string;
    metric_value: number;
  }[]
> {
  const { data, error } = await supabase
    .from("mv_latest_metrics")
    .select("company_id, ticker, name, metric_name, metric_value")
    .eq("sector", sector)
    .in("metric_name", metricNames);

  if (error) throw error;
  return data ?? [];
}

const SCORING_METRICS = [
  "expense_ratio",
  "combined_ratio",
  "loss_ratio",
  "medical_loss_ratio",
  "roe",
  "debt_to_equity",
  "net_premiums_earned",
  "revenue",
  "net_income",
  "total_assets",
  "investment_income",
  "eps",
  "book_value_per_share",
  "roa",
  "premium_growth_yoy",
];

/**
 * Internal: fetches bulk scoring data using the lightweight read-only client.
 * Wrapped with unstable_cache for cross-request caching (1hr).
 */
const _fetchBulkScoringData = unstable_cache(
  async (): Promise<BulkScoringData> => {
    const supabase = getReadOnlyClient();

    const [companiesRes, latestRes, sectorAvgsRes, tsData] = await Promise.all([
      supabase
        .from("companies")
        .select("id, ticker, name, sector")
        .eq("is_active", true)
        .order("ticker")
        .returns<{ id: string; ticker: string; name: string; sector: string }[]>(),
      supabase
        .from("mv_latest_metrics")
        .select("company_id, ticker, name, sector, metric_name, metric_value")
        .in("metric_name", SCORING_METRICS)
        .returns<LatestMetric[]>(),
      supabase.from("mv_sector_averages").select("*").returns<SectorAverage[]>(),
      paginatedFetch<{
        company_id: string;
        metric_name: string;
        metric_value: number;
        fiscal_year: number;
      }>((from, to) =>
        supabase
          .from("financial_metrics")
          .select("company_id, metric_name, metric_value, fiscal_year")
          .in("metric_name", SCORING_METRICS)
          .eq("period_type", "annual")
          .order("fiscal_year", { ascending: true })
          .range(from, to)
      ),
    ]);

    const companies = (companiesRes.data ?? []).map((c) => ({
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector as Sector,
    }));

    const latestMetrics: Record<string, Record<string, number>> = {};
    for (const row of latestRes.data ?? []) {
      if (!latestMetrics[row.company_id]) latestMetrics[row.company_id] = {};
      latestMetrics[row.company_id][row.metric_name] = row.metric_value;
    }

    const sectorAverages: BulkScoringData["sectorAverages"] = {};
    for (const row of sectorAvgsRes.data ?? []) {
      if (!sectorAverages[row.sector]) sectorAverages[row.sector] = {};
      sectorAverages[row.sector][row.metric_name] = {
        avg: row.avg_value,
        min: row.min_value,
        max: row.max_value,
      };
    }

    const timeseries: BulkScoringData["timeseries"] = {};
    for (const row of tsData) {
      const cid = row.company_id as string;
      if (!timeseries[cid]) timeseries[cid] = {};
      if (!timeseries[cid][row.metric_name]) timeseries[cid][row.metric_name] = [];
      timeseries[cid][row.metric_name].push({
        fiscal_year: row.fiscal_year,
        value: row.metric_value,
      });
    }

    return { companies, latestMetrics, sectorAverages, timeseries };
  },
  ["bulk-scoring-data"],
  { revalidate: 3600, tags: ["scoring-data"] }
);

/**
 * Get bulk scoring data. Cached across requests (1hr) via unstable_cache,
 * and deduplicated within a single request via React cache().
 * The `supabase` parameter is kept for API compatibility but ignored
 * (the cached function uses its own read-only client internally).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getBulkScoringData = cache(async (_supabase?: SupabaseClient): Promise<BulkScoringData> => {
  return _fetchBulkScoringData();
});

/** Eagerly start fetching bulk scoring data (call at top of page components). */
export function preloadBulkScoringData() {
  void getBulkScoringData();
}
