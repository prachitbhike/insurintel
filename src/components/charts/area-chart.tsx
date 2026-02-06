"use client";

import { useId } from "react";
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
}: AreaChartProps) {
  const chartId = useId().replace(/:/g, "");

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
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
                stopOpacity={0.3}
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
            strokeDasharray="3 3"
            className="stroke-border/50"
          />
        )}
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
          width={54}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
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
            strokeWidth={2}
            stackId={stacked ? "stack" : undefined}
            connectNulls
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
