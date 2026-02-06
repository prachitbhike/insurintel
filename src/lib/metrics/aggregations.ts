import { type IndustryTimeseriesRow } from "@/types/database";
import { periodLabel, periodSortKey } from "@/lib/metrics/formatters";

export interface PeriodAggregate {
  period: string;
  sortKey: number;
  [metricKey: string]: number | string | null;
}

/**
 * Aggregates timeseries rows into per-period industry averages for charting.
 * Keys on (fiscal_year, fiscal_quarter) — works for both quarterly and annual data.
 */
export function aggregateIndustryByPeriod(
  rows: IndustryTimeseriesRow[],
  metricNames: string[]
): PeriodAggregate[] {
  const periodMap = new Map<string, { sortKey: number; metrics: Map<string, number[]> }>();

  for (const row of rows) {
    if (!metricNames.includes(row.metric_name)) continue;
    const label = periodLabel(row.fiscal_year, row.fiscal_quarter);
    const sk = periodSortKey(row.fiscal_year, row.fiscal_quarter);

    if (!periodMap.has(label)) {
      periodMap.set(label, { sortKey: sk, metrics: new Map() });
    }
    const entry = periodMap.get(label)!;
    if (!entry.metrics.has(row.metric_name)) {
      entry.metrics.set(row.metric_name, []);
    }
    entry.metrics.get(row.metric_name)!.push(row.metric_value);
  }

  const periods = Array.from(periodMap.entries()).sort(
    (a, b) => a[1].sortKey - b[1].sortKey
  );

  return periods.map(([label, { sortKey, metrics: metricMap }]) => {
    const entry: PeriodAggregate = { period: label, sortKey };
    for (const name of metricNames) {
      const values = metricMap.get(name);
      entry[name] =
        values && values.length > 0
          ? values.reduce((s, v) => s + v, 0) / values.length
          : null;
    }
    return entry;
  });
}

/**
 * Aggregates timeseries by sector for a single metric.
 * Returns { sectorName: [val_period1, val_period2, ...] } for sparklines.
 */
export function aggregateSectorByPeriod(
  rows: IndustryTimeseriesRow[],
  metricName: string
): Record<string, number[]> {
  const sectorPeriodMap = new Map<
    string,
    Map<string, { sortKey: number; values: number[] }>
  >();

  for (const row of rows) {
    if (row.metric_name !== metricName) continue;
    if (!sectorPeriodMap.has(row.sector)) {
      sectorPeriodMap.set(row.sector, new Map());
    }
    const label = periodLabel(row.fiscal_year, row.fiscal_quarter);
    const sk = periodSortKey(row.fiscal_year, row.fiscal_quarter);
    const periodMap = sectorPeriodMap.get(row.sector)!;
    if (!periodMap.has(label)) {
      periodMap.set(label, { sortKey: sk, values: [] });
    }
    periodMap.get(label)!.values.push(row.metric_value);
  }

  const result: Record<string, number[]> = {};
  for (const [sector, periodMap] of sectorPeriodMap) {
    const sorted = Array.from(periodMap.entries()).sort(
      (a, b) => a[1].sortKey - b[1].sortKey
    );
    result[sector] = sorted.map(([, { values }]) => {
      return values.reduce((s, v) => s + v, 0) / values.length;
    });
  }

  return result;
}

/**
 * Extracts a single company's timeseries for a metric as a number array.
 * Sorted by (fiscal_year, fiscal_quarter). Used for per-company sparklines.
 */
export function extractCompanyTimeseries(
  rows: IndustryTimeseriesRow[],
  metricName: string,
  companyId: string
): number[] {
  return rows
    .filter(
      (r) => r.metric_name === metricName && r.company_id === companyId
    )
    .sort((a, b) => {
      const skA = periodSortKey(a.fiscal_year, a.fiscal_quarter);
      const skB = periodSortKey(b.fiscal_year, b.fiscal_quarter);
      return skA - skB;
    })
    .map((r) => r.metric_value);
}
