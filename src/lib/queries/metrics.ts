import { type SupabaseClient } from "@supabase/supabase-js";
import {
  type LatestMetric,
  type MetricTimeseries,
  type IndustryTimeseriesRow,
  type Sector,
} from "@/types/database";

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
