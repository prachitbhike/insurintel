"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type PeerComparison as PeerComparisonType } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { exportChartAsPNG } from "@/lib/export/chart-png";

interface PeerComparisonProps {
  comparisons: PeerComparisonType[];
  ticker: string;
}

export function PeerComparison({ comparisons }: PeerComparisonProps) {
  if (comparisons.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    const headers = ["Metric", "Company", "Sector Avg", "Rank"];
    const rows = comparisons.map((c) => {
      const def = METRIC_DEFINITIONS[c.metric_name];
      return [
        def?.label ?? c.metric_name,
        formatMetricValue(c.metric_name, c.company_value),
        formatMetricValue(c.metric_name, c.sector_avg),
        c.rank != null && c.total != null ? `#${c.rank}/${c.total}` : "—",
      ];
    });
    return copyTableToClipboard(headers, rows);
  };

  const handleCSV = () => {
    const headers = ["Metric", "Company", "Sector Avg", "Rank"];
    const rows = comparisons.map((c) => {
      const def = METRIC_DEFINITIONS[c.metric_name];
      return [
        def?.label ?? c.metric_name,
        formatMetricValue(c.metric_name, c.company_value),
        formatMetricValue(c.metric_name, c.sector_avg),
        c.rank != null && c.total != null ? `#${c.rank}/${c.total}` : "—",
      ];
    });
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, "peer-comparison.csv");
  };

  const handlePNG = async () => {
    const el = document.querySelector("[data-chart-export='peer-comparison']");
    if (el instanceof HTMLElement) return exportChartAsPNG(el, "peer-comparison.png");
    return false;
  };

  // Build chart data: % difference vs sector average, normalized so all metrics are comparable
  const chartData = comparisons
    .filter(
      (c) => c.company_value != null && c.sector_avg != null && c.sector_avg !== 0
    )
    .map((c) => {
      const def = METRIC_DEFINITIONS[c.metric_name];
      const label = def?.label ?? c.metric_name.replace(/_/g, " ");
      const pctDiff =
        ((c.company_value! - c.sector_avg!) / Math.abs(c.sector_avg!)) * 100;
      // Flip sign for "lower is better" metrics so positive always = outperforming
      const performance =
        def?.higher_is_better === false ? -pctDiff : pctDiff;
      return {
        metric: label,
        performance: Math.round(performance * 10) / 10,
      };
    })
    // Sort: biggest outperformance at top
    .sort((a, b) => b.performance - a.performance);

  const config: ChartConfig = {
    performance: {
      label: "vs Sector Avg (%)",
      color: "var(--chart-1)",
    },
  };

  const chartHeight = Math.max(160, chartData.length * 32 + 30);

  return (
    <Card className="rounded-sm group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Peer Comparison</CardTitle>
            <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} onPNG={handlePNG} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Green = outperforming sector avg. Red = underperforming.
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Not enough peer data for comparison.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height: chartHeight }}
            data-chart-export="peer-comparison"
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 30, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="2 6"
                className="stroke-border/15"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
              />
              <YAxis
                type="category"
                dataKey="metric"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                width={130}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      const v = value as number;
                      return `${v > 0 ? "+" : ""}${v.toFixed(1)}% vs sector avg`;
                    }}
                  />
                }
              />
              <ReferenceLine
                x={0}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Bar dataKey="performance" radius={[0, 2, 2, 0]} maxBarSize={20}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.metric}
                    fill={
                      entry.performance >= 0
                        ? "var(--positive)"
                        : "var(--negative)"
                    }
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
