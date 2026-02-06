import { type SupabaseClient } from "@supabase/supabase-js";
import {
  type LatestMetric,
  type MetricTimeseries,
  type IndustryTimeseriesRow,
  type SectorAverage,
  type Sector,
} from "@/types/database";
import { type BulkScoringData } from "@/lib/scoring/types";

export async function getLatestMetrics(
  supabase: SupabaseClient,
  companyId?: string
): Promise<LatestMetric[]> {
  let query = supabase.from("mv_latest_metrics").select("*");
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getMetricTimeseries(
  supabase: SupabaseClient,
  companyId: string,
  metricNames?: string[]
): Promise<MetricTimeseries[]> {
  let query = supabase
    .from("mv_metric_timeseries")
    .select("*")
    .eq("company_id", companyId)
    .order("fiscal_year", { ascending: true });

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
  const { data, error } = await supabase
    .from("financial_metrics")
    .select("metric_name, metric_value, unit, fiscal_year, fiscal_quarter")
    .eq("company_id", companyId)
    .eq("period_type", periodType)
    .order("fiscal_year", { ascending: false })
    .order("metric_name");

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
  const [timeseriesRes, companiesRes] = await Promise.all([
    supabase
      .from("mv_metric_timeseries")
      .select("company_id, ticker, metric_name, metric_value, fiscal_year")
      .in("metric_name", metricNames)
      .eq("period_type", "annual")
      .order("fiscal_year", { ascending: true }),
    supabase.from("companies").select("id, sector"),
  ]);

  if (timeseriesRes.error) throw timeseriesRes.error;
  if (companiesRes.error) throw companiesRes.error;

  const sectorMap = new Map<string, Sector>();
  for (const c of companiesRes.data ?? []) {
    sectorMap.set(c.id, c.sector as Sector);
  }

  return (timeseriesRes.data ?? []).map((row) => ({
    ...row,
    sector: sectorMap.get(row.company_id) ?? ("P&C" as Sector),
  }));
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
];

export async function getBulkScoringData(
  supabase: SupabaseClient
): Promise<BulkScoringData> {
  const [companiesRes, latestRes, sectorAvgsRes, tsRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, ticker, name, sector")
      .eq("is_active", true)
      .order("ticker"),
    supabase
      .from("mv_latest_metrics")
      .select("company_id, ticker, name, sector, metric_name, metric_value")
      .in("metric_name", SCORING_METRICS),
    supabase.from("mv_sector_averages").select("*"),
    supabase
      .from("mv_metric_timeseries")
      .select("company_id, metric_name, metric_value, fiscal_year")
      .in("metric_name", SCORING_METRICS)
      .eq("period_type", "annual")
      .order("fiscal_year", { ascending: true }),
  ]);

  const companies = (companiesRes.data ?? []).map((c) => ({
    id: c.id as string,
    ticker: c.ticker as string,
    name: c.name as string,
    sector: c.sector as Sector,
  }));

  // Build latest metrics: companyId -> { metricName: value }
  const latestMetrics: Record<string, Record<string, number>> = {};
  for (const row of (latestRes.data ?? []) as LatestMetric[]) {
    if (!latestMetrics[row.company_id]) latestMetrics[row.company_id] = {};
    latestMetrics[row.company_id][row.metric_name] = row.metric_value;
  }

  // Build sector averages: sector -> { metricName: { avg, min, max } }
  const sectorAverages: BulkScoringData["sectorAverages"] = {};
  for (const row of (sectorAvgsRes.data ?? []) as SectorAverage[]) {
    if (!sectorAverages[row.sector]) sectorAverages[row.sector] = {};
    sectorAverages[row.sector][row.metric_name] = {
      avg: row.avg_value,
      min: row.min_value,
      max: row.max_value,
    };
  }

  // Build timeseries: companyId -> { metricName: [{ fiscal_year, value }] }
  const timeseries: BulkScoringData["timeseries"] = {};
  for (const row of tsRes.data ?? []) {
    const cid = row.company_id as string;
    if (!timeseries[cid]) timeseries[cid] = {};
    if (!timeseries[cid][row.metric_name]) timeseries[cid][row.metric_name] = [];
    timeseries[cid][row.metric_name].push({
      fiscal_year: row.fiscal_year,
      value: row.metric_value,
    });
  }

  return { companies, latestMetrics, sectorAverages, timeseries };
}
