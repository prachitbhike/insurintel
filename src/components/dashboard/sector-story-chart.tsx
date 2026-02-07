"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { SECTOR_CHART_CONFIG } from "@/lib/data/sector-story-config";
import { type Sector } from "@/types/database";


interface StoryChartEntry {
  ticker: string;
  value: number;
}

interface SectorStoryChartProps {
  sectorName: Sector;
  data: StoryChartEntry[];
  sectorAvg: number | null;
}

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SectorStoryChart({
  sectorName,
  data,
  sectorAvg,
}: SectorStoryChartProps) {
  const cfg = SECTOR_CHART_CONFIG[sectorName];
  if (!cfg || data.length === 0) return null;

  // Sort: for higher_is_better metrics, descending; otherwise ascending
  const sorted = [...data].sort((a, b) =>
    cfg.higherIsBetter ? b.value - a.value : a.value - b.value
  );

  const best = sorted[0]?.value ?? 0;
  const worst = sorted[sorted.length - 1]?.value ?? 0;

  return (
    <Card className="rounded-sm">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-base font-display tracking-tight">{cfg.title}</CardTitle>
        <CardDescription className="text-xs">{cfg.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(180, sorted.length * 26 + 36) }}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
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
              tickMargin={8}
              tickFormatter={(v: number) => formatMetricValue(cfg.metric, v)}
            />
            <YAxis
              type="category"
              dataKey="ticker"
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              width={80}
            />
            {sectorAvg != null && (
              <ReferenceLine
                x={sectorAvg}
                strokeDasharray="4 4"
                className="stroke-primary/50"
                label={{
                  value: `Avg ${formatMetricValue(cfg.metric, sectorAvg)}`,
                  position: "top",
                  className: "text-[11px] fill-muted-foreground",
                }}
              />
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatMetricValue(cfg.metric, value as number)}
                />
              }
            />
            <Bar dataKey="value" radius={[0, 2, 2, 0]}>
              {sorted.map((entry) => {
                let fill = "var(--chart-1)";
                if (entry.value === best) fill = "var(--positive)";
                else if (entry.value === worst) fill = "var(--negative)";
                return <Cell key={entry.ticker} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
