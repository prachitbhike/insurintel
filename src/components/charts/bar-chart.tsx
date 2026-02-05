"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
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

interface BarChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  dataKeys: string[];
  config: ChartConfig;
  height?: number;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
}

export function BarChartComponent({
  data,
  xKey,
  dataKeys,
  config,
  height = 300,
  layout = "horizontal",
  stacked = false,
}: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 10, right: 10, left: isVertical ? 80 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          {isVertical ? (
            <>
              <XAxis type="number" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
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
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
              <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" width={60} />
            </>
          )}
          <ChartTooltip content={<ChartTooltipContent />} />
          {dataKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
