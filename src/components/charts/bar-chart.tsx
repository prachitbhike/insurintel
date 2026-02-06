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
}: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsBarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, left: isVertical ? 80 : -4, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={!isVertical}
          vertical={isVertical}
          strokeDasharray="3 3"
          className="stroke-border/40"
        />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              tickMargin={8}
              tickFormatter={yAxisTickFormatter as (value: string | number) => string}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              tickMargin={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              width={56}
              tickFormatter={yAxisTickFormatter as (value: string | number) => string}
            />
          </>
        )}
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
            radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}
