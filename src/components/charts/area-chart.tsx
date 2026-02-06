"use client";

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
}

export function AreaChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  showGrid = true,
  stacked = false,
}: AreaChartProps) {
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
          width={60}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {dataKeys.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            fill={`var(--color-${key})`}
            stroke={`var(--color-${key})`}
            fillOpacity={0.15}
            strokeWidth={2}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
