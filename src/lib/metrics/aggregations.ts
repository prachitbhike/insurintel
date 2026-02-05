import { type IndustryTimeseriesRow } from "@/types/database";

export interface YearlyAggregate {
  year: number;
  [metricKey: string]: number | null;
}

/**
 * Aggregates timeseries rows into yearly industry averages for charting.
 * Returns one object per year with avg values for each metric.
 */
export function aggregateIndustryByYear(
  rows: IndustryTimeseriesRow[],
  metricNames: string[]
): YearlyAggregate[] {
  const yearMap = new Map<number, Map<string, number[]>>();

  for (const row of rows) {
    if (!metricNames.includes(row.metric_name)) continue;
    if (!yearMap.has(row.fiscal_year)) {
      yearMap.set(row.fiscal_year, new Map());
    }
    const metricMap = yearMap.get(row.fiscal_year)!;
    if (!metricMap.has(row.metric_name)) {
      metricMap.set(row.metric_name, []);
    }
    metricMap.get(row.metric_name)!.push(row.metric_value);
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => a - b);

  return years.map((year) => {
    const metricMap = yearMap.get(year)!;
    const entry: YearlyAggregate = { year };
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
 * Returns { sectorName: [val_year1, val_year2, ...] } for sparklines.
 */
export function aggregateSectorByYear(
  rows: IndustryTimeseriesRow[],
  metricName: string
): Record<string, number[]> {
  const sectorYearMap = new Map<string, Map<number, number[]>>();

  for (const row of rows) {
    if (row.metric_name !== metricName) continue;
    if (!sectorYearMap.has(row.sector)) {
      sectorYearMap.set(row.sector, new Map());
    }
    const yearMap = sectorYearMap.get(row.sector)!;
    if (!yearMap.has(row.fiscal_year)) {
      yearMap.set(row.fiscal_year, []);
    }
    yearMap.get(row.fiscal_year)!.push(row.metric_value);
  }

  const result: Record<string, number[]> = {};
  for (const [sector, yearMap] of sectorYearMap) {
    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
    result[sector] = years.map((year) => {
      const values = yearMap.get(year)!;
      return values.reduce((s, v) => s + v, 0) / values.length;
    });
  }

  return result;
}

/**
 * Extracts a single company's timeseries for a metric as a number array.
 * Used for per-company sparklines.
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
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((r) => r.metric_value);
}
