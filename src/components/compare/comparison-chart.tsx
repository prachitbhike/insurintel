"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChartComponent } from "@/components/charts/line-chart";
import { type MetricTimeseries } from "@/types/database";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { type ChartConfig } from "@/components/ui/chart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface ComparisonChartProps {
  companies: { ticker: string; name: string }[];
  timeseries: Record<string, MetricTimeseries[]>;
  availableMetrics: string[];
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
}

export function ComparisonChart({
  companies,
  timeseries,
  availableMetrics,
  selectedMetric,
  onMetricChange,
}: ComparisonChartProps) {
  const tsData = timeseries[selectedMetric] ?? [];
  const def = METRIC_DEFINITIONS[selectedMetric];

  // Build chart data grouped by year
  const yearSet = new Set<number>();
  for (const d of tsData) yearSet.add(d.fiscal_year);
  const years = [...yearSet].sort();

  const chartData = years.map((year) => {
    const point: Record<string, string | number | null> = { year: String(year) };
    for (const c of companies) {
      const entry = tsData.find(
        (d) => d.fiscal_year === year && d.ticker === c.ticker
      );
      point[c.ticker] = entry?.metric_value ?? null;
    }
    return point;
  });

  const config: ChartConfig = {};
  companies.forEach((c, i) => {
    config[c.ticker] = {
      label: c.ticker,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  // Unit label for context
  const unitLabel = def?.unit === "currency"
    ? "USD"
    : def?.unit === "percent"
      ? "%"
      : def?.unit === "ratio"
        ? "x"
        : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Trend Comparison</CardTitle>
          {def && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {def.label}{unitLabel ? ` (${unitLabel})` : ""}
            </p>
          )}
        </div>
        <Select value={selectedMetric} onValueChange={onMetricChange}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map((m) => {
              const mDef = METRIC_DEFINITIONS[m];
              return (
                <SelectItem key={m} value={m}>
                  {mDef?.label ?? m.replace(/_/g, " ")}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <LineChartComponent
            data={chartData}
            xKey="year"
            dataKeys={companies.map((c) => c.ticker)}
            config={config}
            height={350}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No trend data available for this metric. Try selecting a different metric.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
