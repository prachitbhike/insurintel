"use client";

import {
  BarChart,
  Bar,
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

export interface PCBreakevenItem {
  ticker: string;
  name: string;
  combinedRatio: number;
  score: number | null;
}

interface PCBreakevenChartProps {
  data: PCBreakevenItem[];
  sectorAvg: number | null;
}

const chartConfig = {
  combinedRatio: {
    label: "Combined Ratio",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function PCBreakevenChart({ data, sectorAvg }: PCBreakevenChartProps) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.combinedRatio - a.combinedRatio);

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: Math.max(280, sorted.length * 30 + 60) }}
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
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          domain={[
            (dataMin: number) => Math.floor(Math.min(dataMin, 90)),
            (dataMax: number) => Math.ceil(Math.max(dataMax, 110)),
          ]}
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
          x={100}
          strokeDasharray="6 3"
          stroke="var(--negative)"
          strokeWidth={1.5}
          label={{
            value: "Breakeven",
            position: "top",
            className: "text-[11px] fill-red-500 font-medium",
          }}
        />
        {sectorAvg != null && (
          <ReferenceLine
            x={sectorAvg}
            strokeDasharray="4 4"
            className="stroke-primary/40"
            label={{
              value: `Avg ${sectorAvg.toFixed(1)}%`,
              position: "insideTopRight",
              className: "text-[11px] fill-muted-foreground",
            }}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${(value as number).toFixed(1)}%`}
              labelFormatter={(label) => {
                const item = sorted.find((d) => d.ticker === label);
                return item ? `${item.ticker} — ${item.name}` : label;
              }}
            />
          }
        />
        <Bar dataKey="combinedRatio" radius={[0, 2, 2, 0]} maxBarSize={24}>
          {sorted.map((entry) => {
            const fill =
              entry.combinedRatio > 105
                ? "var(--negative)"
                : entry.combinedRatio > 100
                  ? "hsl(45 93% 47%)"
                  : entry.combinedRatio > 95
                    ? "var(--positive)"
                    : "var(--positive)";
            return <Cell key={entry.ticker} fill={fill} />;
          })}
          <LabelList
            dataKey="combinedRatio"
            position="right"
            className="fill-muted-foreground text-[11px] font-mono"
            formatter={(v: number) => `${v.toFixed(1)}%`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
