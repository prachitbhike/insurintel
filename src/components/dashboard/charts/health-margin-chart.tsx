"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface HealthMarginItem {
  ticker: string;
  name: string;
  mlr: number;
  adminMargin: number;
  revenue: number | null;
}

interface HealthMarginChartProps {
  data: HealthMarginItem[];
}

const chartConfig = {
  mlr: {
    label: "Claims (MLR)",
    color: "var(--muted)",
  },
  adminMargin: {
    label: "Admin Margin",
    color: "hsl(263 70% 50%)",
  },
} satisfies ChartConfig;

export function HealthMarginChart({ data }: HealthMarginChartProps) {
  if (data.length === 0) return null;

  // Sort by admin margin, thinnest first
  const sorted = [...data].sort((a, b) => a.adminMargin - b.adminMargin);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: Math.max(220, sorted.length * 48 + 60) }}
    >
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 12, right: 60, left: 48, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={false}
          vertical
          strokeDasharray="2 6"
          className="stroke-border/15"
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="ticker"
          tickLine={false}
          axisLine={false}
          className="text-[11px] fill-muted-foreground font-mono"
          width={48}
        />
        <ReferenceLine
          x={85}
          strokeDasharray="6 3"
          stroke="hsl(263 70% 50%)"
          strokeWidth={1.5}
          label={{
            value: "ACA 85% Floor",
            position: "top",
            className: "text-[11px] fill-violet-500 font-medium",
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const label = name === "mlr" ? "Claims (MLR)" : "Admin Margin";
                return `${label}: ${(value as number).toFixed(1)}%`;
              }}
              labelFormatter={(label) => {
                const item = sorted.find((d) => d.ticker === label);
                return item ? `${item.ticker} — ${item.name}` : label;
              }}
            />
          }
        />
        <Bar
          dataKey="mlr"
          stackId="stack"
          fill="oklch(0.55 0.015 250 / 0.2)"
          radius={[0, 0, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="adminMargin"
          stackId="stack"
          fill="hsl(263 70% 50%)"
          radius={[0, 2, 2, 0]}
          maxBarSize={28}
        >
          <LabelList
            dataKey="adminMargin"
            position="right"
            className="fill-violet-600 dark:fill-violet-400 text-[11px] font-mono font-medium"
            formatter={(v: number) => `${v.toFixed(1)}% margin`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
