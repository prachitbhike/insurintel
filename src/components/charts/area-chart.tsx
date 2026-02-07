"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
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

interface AreaChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  showGrid?: boolean;
  stacked?: boolean;
  showLegend?: boolean;
  yAxisTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
  xAxisTickFormatter?: (value: string, index: number) => string;
}

export function AreaChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  showGrid = true,
  stacked = false,
  showLegend = true,
  yAxisTickFormatter,
  tooltipFormatter,
  xAxisTickFormatter,
}: AreaChartProps) {
  const chartId = useId().replace(/:/g, "");

  return (
    <ChartContainer config={config} className="w-full aspect-auto" style={{ height }}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 8, right: 16, left: -4, bottom: 20 }}
      >
        <defs>
          {dataKeys.map((key) => (
            <linearGradient
              key={key}
              id={`area-fill-${key}-${chartId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid
            vertical={false}
            strokeDasharray="2 6"
            className="stroke-border/15"
          />
        )}
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground"
          tickMargin={8}
          interval={0}
          tickFormatter={xAxisTickFormatter as (value: string | number) => string}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground"
          width={56}
          tickFormatter={yAxisTickFormatter as (value: string | number) => string}
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
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            fill={`url(#area-fill-${key}-${chartId})`}
            stroke={`var(--color-${key})`}
            strokeWidth={2.5}
            stackId={stacked ? "stack" : undefined}
            connectNulls
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
