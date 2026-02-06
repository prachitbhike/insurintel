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
import { formatMetricValue, formatChartTick, periodLabel, periodSortKey } from "@/lib/metrics/formatters";
import { type ChartConfig } from "@/components/ui/chart";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { exportChartAsPNG } from "@/lib/export/chart-png";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const UNIT_LABELS: Record<string, string> = {
  currency: "USD",
  percent: "%",
  ratio: "Ratio",
  per_share: "Per Share",
  number: "",
};

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
  const unit = def?.unit ?? "number";

  // Build chart data grouped by period
  const periodSet = new Set<string>();
  const sortKeys = new Map<string, number>();
  for (const d of tsData) {
    const label = periodLabel(d.fiscal_year, d.fiscal_quarter);
    periodSet.add(label);
    sortKeys.set(label, periodSortKey(d.fiscal_year, d.fiscal_quarter));
  }
  const periods = [...periodSet].sort(
    (a, b) => (sortKeys.get(a) ?? 0) - (sortKeys.get(b) ?? 0)
  );

  const chartData = periods.map((period) => {
    const point: Record<string, string | number | null> = { period };
    for (const c of companies) {
      const entry = tsData.find(
        (d) => periodLabel(d.fiscal_year, d.fiscal_quarter) === period && d.ticker === c.ticker
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

  const unitLabel = UNIT_LABELS[unit] ?? "";
  const tickFormatter = (v: number) => formatChartTick(v, unit);
  const tooltipFormatter = (v: number) =>
    formatMetricValue(selectedMetric, v);

  const handlePNG = async () => {
    const el = document.querySelector("[data-chart-export='comparison-chart']");
    if (el instanceof HTMLElement) return exportChartAsPNG(el, "trend-comparison.png");
    return false;
  };

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Trend Comparison</CardTitle>
            <ExportButtonGroup onPNG={handlePNG} />
          </div>
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
              const mUnit = UNIT_LABELS[mDef?.unit ?? ""] ?? "";
              return (
                <SelectItem key={m} value={m}>
                  {mDef?.label ?? m.replace(/_/g, " ")}
                  {mUnit ? ` (${mUnit})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent data-chart-export="comparison-chart">
        {chartData.length > 0 ? (
          <LineChartComponent
            data={chartData}
            xKey="period"
            dataKeys={companies.map((c) => c.ticker)}
            config={config}
            height={350}
            yAxisTickFormatter={tickFormatter}
            tooltipFormatter={tooltipFormatter}
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
