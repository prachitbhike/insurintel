"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

const LINE_COLORS = [
  "oklch(0.55 0.15 250)",
  "oklch(0.55 0.17 155)",
  "oklch(0.65 0.15 45)",
  "oklch(0.55 0.2 280)",
  "oklch(0.6 0.15 340)",
  "oklch(0.6 0.14 200)",
  "oklch(0.65 0.18 100)",
  "oklch(0.55 0.15 15)",
  "oklch(0.6 0.12 310)",
  "oklch(0.65 0.1 180)",
  "oklch(0.5 0.18 260)",
  "oklch(0.6 0.16 70)",
  "oklch(0.55 0.14 130)",
  "oklch(0.6 0.2 350)",
  "oklch(0.65 0.12 230)",
];

export interface SectorTrendData {
  [metricName: string]: { year: number; [ticker: string]: number | null }[];
}

interface SectorTrendChartsProps {
  trendData: SectorTrendData;
  availableMetrics: string[];
  tickers: string[];
}

export function SectorTrendCharts({
  trendData,
  availableMetrics,
  tickers,
}: SectorTrendChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics[0] ?? "roe"
  );

  const data = trendData[selectedMetric] ?? [];

  const config: ChartConfig = Object.fromEntries(
    tickers.map((ticker, i) => [
      ticker,
      {
        label: ticker,
        color: LINE_COLORS[i % LINE_COLORS.length],
      },
    ])
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company Trends</CardTitle>
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map((m) => (
              <SelectItem key={m} value={m}>
                {METRIC_DEFINITIONS[m]?.label ?? m.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={config} className="w-full" style={{ height: 360 }}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="year"
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
              {tickers.map((ticker) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={`var(--color-${ticker})`}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No trend data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
