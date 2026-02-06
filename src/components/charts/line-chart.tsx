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

interface LineChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  showGrid = true,
  showLegend = true,
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
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2.5}
            dot={{
              r: 3.5,
              strokeWidth: 2,
              fill: "var(--color-background)",
            }}
            activeDot={{ r: 5, strokeWidth: 2 }}
            connectNulls
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}
