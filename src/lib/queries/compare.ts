import { type SupabaseClient } from "@supabase/supabase-js";
import { type MetricTimeseries, type LatestMetric } from "@/types/database";

export interface ComparisonData {
  companies: {
    id: string;
    ticker: string;
    name: string;
    sector: string;
  }[];
  metrics: Record<string, Record<string, number | null>>;
  timeseries: Record<string, MetricTimeseries[]>;
}

export async function getComparisonData(
  supabase: SupabaseClient,
  tickers: string[],
  metricNames?: string[]
): Promise<ComparisonData> {
  // Get companies
  const { data: companies, error: compError } = await supabase
    .from("companies")
    .select("id, ticker, name, sector")
    .in("ticker", tickers.map((t) => t.toUpperCase()));

  if (compError) throw compError;
  if (!companies || companies.length === 0) {
    return { companies: [], metrics: {}, timeseries: {} };
  }

  const companyIds = companies.map((c) => c.id);

  // Get latest metrics
  let metricsQuery = supabase
    .from("mv_latest_metrics")
    .select("*")
    .in("company_id", companyIds);

  if (metricNames && metricNames.length > 0) {
    metricsQuery = metricsQuery.in("metric_name", metricNames);
  }

  const { data: latestMetrics, error: metError } = await metricsQuery;
  if (metError) throw metError;

  // Build metrics map: { metric_name: { ticker: value } }
  const metricsMap: Record<string, Record<string, number | null>> = {};
  for (const m of (latestMetrics ?? []) as LatestMetric[]) {
    if (!metricsMap[m.metric_name]) metricsMap[m.metric_name] = {};
    metricsMap[m.metric_name][m.ticker] = m.metric_value;
  }

  // Get timeseries
  let tsQuery = supabase
    .from("mv_metric_timeseries")
    .select("*")
    .in("company_id", companyIds)
    .order("fiscal_year", { ascending: true });

  if (metricNames && metricNames.length > 0) {
    tsQuery = tsQuery.in("metric_name", metricNames);
  }

  const { data: timeseries, error: tsError } = await tsQuery;
  if (tsError) throw tsError;

  // Group timeseries by metric
  const tsMap: Record<string, MetricTimeseries[]> = {};
  for (const ts of (timeseries ?? []) as MetricTimeseries[]) {
    if (!tsMap[ts.metric_name]) tsMap[ts.metric_name] = [];
    tsMap[ts.metric_name].push(ts);
  }

  return {
    companies,
    metrics: metricsMap,
    timeseries: tsMap,
  };
}
