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
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type PeerComparison as PeerComparisonType } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { MetricLabel } from "@/components/ui/metric-label";
import { cn } from "@/lib/utils";

interface PeerComparisonProps {
  comparisons: PeerComparisonType[];
  ticker: string;
}

export function PeerComparison({ comparisons }: PeerComparisonProps) {
  if (comparisons.length === 0) {
    return null;
  }

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

  const chartHeight = Math.max(220, chartData.length * 44 + 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peer Comparison</CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance relative to sector average — green = outperforming, red =
          underperforming
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartData.length > 0 && (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height: chartHeight }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 30, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                className="stroke-border/50"
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
              <Bar dataKey="performance" radius={[0, 6, 6, 0]} maxBarSize={24}>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((c) => {
            const def = METRIC_DEFINITIONS[c.metric_name];
            const hasBoth = c.company_value != null && c.sector_avg != null;
            let isOutperforming: boolean | null = null;
            if (hasBoth && c.sector_avg !== 0) {
              const diff = c.company_value! - c.sector_avg!;
              isOutperforming = def?.higher_is_better ? diff > 0 : diff < 0;
            }

            return (
              <div
                key={c.metric_name}
                className="flex flex-col gap-1.5 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <MetricLabel
                    metricName={c.metric_name}
                    className="text-xs text-muted-foreground"
                    iconClassName="h-2.5 w-2.5"
                  />
                  {c.rank != null && c.total != null && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono"
                    >
                      #{c.rank}/{c.total}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      isOutperforming === true && "text-positive",
                      isOutperforming === false && "text-negative"
                    )}
                  >
                    {formatMetricValue(c.metric_name, c.company_value)}
                  </span>
                  {c.sector_avg != null && (
                    <span className="text-xs text-muted-foreground">
                      avg {formatMetricValue(c.metric_name, c.sector_avg)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
