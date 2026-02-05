"use client";

import {
  Line,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface LineChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  showGrid?: boolean;
}

export function LineChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  showGrid = true,
}: LineChartProps) {
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
