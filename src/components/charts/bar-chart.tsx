"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ReactNode } from "react";

interface BarChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
  showLegend?: boolean;
  yAxisTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
  xAxisTickFormatter?: (value: string, index: number) => string;
}

export function BarChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  layout = "horizontal",
  stacked = false,
  showLegend = true,
  yAxisTickFormatter,
  tooltipFormatter,
  xAxisTickFormatter,
}: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartContainer config={config} className="w-full aspect-auto" style={{ height }}>
      <RechartsBarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, left: isVertical ? 80 : -4, bottom: 20 }}
      >
        <CartesianGrid
          horizontal={!isVertical}
          vertical={isVertical}
          strokeDasharray="2 6"
          className="stroke-border/15"
        />
        <XAxis
          {...(isVertical
            ? { type: "number" as const, tickFormatter: yAxisTickFormatter as (value: string | number) => string }
            : { dataKey: xKey, interval: 0 as const, tickFormatter: xAxisTickFormatter as (value: string | number) => string }
          )}
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground"
          tickMargin={8}
        />
        <YAxis
          {...(isVertical
            ? { type: "category" as const, dataKey: xKey, width: 80 }
            : { width: 56, tickFormatter: yAxisTickFormatter as (value: string | number) => string }
          )}
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={
                tooltipFormatter
                  ? (value, name) =>
                      tooltipFormatter(value as number, name as string)
                  : undefined
              }
            />
          }
        />
        {showLegend && dataKeys.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {dataKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={isVertical ? [0, 2, 2, 0] : [2, 2, 0, 0]}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}
