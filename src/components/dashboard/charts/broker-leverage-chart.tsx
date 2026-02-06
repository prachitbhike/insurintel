"use client";

import {
  ComposedChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface BrokerLeverageItem {
  ticker: string;
  name: string;
  debtToEquity: number;
  roe: number | null;
  revenue: number | null;
}

interface BrokerLeverageChartProps {
  data: BrokerLeverageItem[];
  avgDE: number | null;
  avgROE: number | null;
}

const chartConfig = {
  debtToEquity: {
    label: "Debt-to-Equity",
    color: "hsl(347 77% 50%)",
  },
  roe: {
    label: "ROE",
    color: "var(--positive)",
  },
} satisfies ChartConfig;

export function BrokerLeverageChart({
  data,
  avgDE,
}: BrokerLeverageChartProps) {
  if (data.length === 0) return null;

  // Sort by D/E highest first
  const sorted = [...data].sort((a, b) => b.debtToEquity - a.debtToEquity);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: Math.max(280, sorted.length * 36 + 60) }}
    >
      <ComposedChart
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
          className="text-[10px] fill-muted-foreground"
          tickFormatter={(v: number) => `${v.toFixed(1)}x`}
        />
        <YAxis
          type="category"
          dataKey="ticker"
          tickLine={false}
          axisLine={false}
          className="text-[10px] fill-muted-foreground font-mono"
          width={48}
        />
        {avgDE != null && (
          <ReferenceLine
            x={avgDE}
            strokeDasharray="4 4"
            stroke="hsl(347 77% 50% / 0.5)"
            label={{
              value: `Avg D/E ${avgDE.toFixed(1)}x`,
              position: "top",
              className: "text-[10px] fill-rose-500",
            }}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                if (name === "debtToEquity") return `D/E: ${(value as number).toFixed(2)}x`;
                if (name === "roe") return `ROE: ${(value as number).toFixed(1)}%`;
                return String(value);
              }}
              labelFormatter={(label) => {
                const item = sorted.find((d) => d.ticker === label);
                return item ? `${item.ticker} — ${item.name}` : label;
              }}
            />
          }
        />
        <Bar
          dataKey="debtToEquity"
          fill="hsl(347 77% 50%)"
          fillOpacity={0.7}
          radius={[0, 2, 2, 0]}
          maxBarSize={24}
        >
          {sorted.map((entry) => (
            <Cell
              key={entry.ticker}
              fill="hsl(347 77% 50%)"
              fillOpacity={entry.debtToEquity > (avgDE ?? 999) ? 0.85 : 0.45}
            />
          ))}
          <LabelList
            dataKey="debtToEquity"
            position="right"
            className="fill-muted-foreground text-[10px] font-mono"
            formatter={(v: number) => `${v.toFixed(1)}x`}
          />
        </Bar>
        <Scatter
          dataKey="roe"
          fill="var(--positive)"
          shape="circle"
          legendType="circle"
          name="ROE %"
        />
      </ComposedChart>
    </ChartContainer>
  );
}
