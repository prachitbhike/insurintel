"use client";

import {
  Line,
  LineChart as RechartsLineChart,
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

interface LineChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
}

export function LineChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  showGrid = true,
  showLegend = true,
  yAxisTickFormatter,
  tooltipFormatter,
}: LineChartProps) {
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsLineChart
        data={data}
        margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
      >
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
          className="text-[10px] fill-muted-foreground"
          tickMargin={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-[10px] fill-muted-foreground"
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
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2.5}
            dot={{
              r: 3,
              strokeWidth: 1.5,
              fill: "var(--color-background)",
            }}
            activeDot={{ r: 4.5, strokeWidth: 1.5 }}
            connectNulls
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}
