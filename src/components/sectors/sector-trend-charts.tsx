"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
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
import { formatMetricValue, formatChartTick } from "@/lib/metrics/formatters";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { exportChartAsPNG } from "@/lib/export/chart-png";

export interface SectorTrendData {
  [metricName: string]: { period: string; [ticker: string]: string | number | null }[];
}

interface SectorTrendChartsProps {
  trendData: SectorTrendData;
  quarterlyTrendData?: SectorTrendData;
  availableMetrics: string[];
  tickers: string[];
}

export function SectorTrendCharts({
  trendData,
  quarterlyTrendData,
  availableMetrics,
  tickers,
}: SectorTrendChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics[0] ?? "roe"
  );
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">("annual");

  const activeTrendData = periodType === "quarterly" && quarterlyTrendData
    ? quarterlyTrendData
    : trendData;
  const timeseriesData = activeTrendData[selectedMetric] ?? [];
  const def = METRIC_DEFINITIONS[selectedMetric];
  const higherIsBetter = def?.higher_is_better ?? true;

  // Extract the latest year's value per ticker, sort best-to-worst
  const { barData, sectorAvg } = useMemo(() => {
    if (timeseriesData.length === 0) return { barData: [], sectorAvg: null };

    const latestRow = timeseriesData[timeseriesData.length - 1];

    const entries: { ticker: string; value: number }[] = [];
    for (const t of tickers) {
      const v = latestRow[t];
      if (v != null) {
        entries.push({ ticker: t, value: v as number });
      }
    }

    // Sort: best first
    entries.sort((a, b) =>
      higherIsBetter ? b.value - a.value : a.value - b.value
    );

    const avg =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.value, 0) / entries.length
        : null;

    return { barData: entries, sectorAvg: avg };
  }, [timeseriesData, tickers, higherIsBetter]);

  const config: ChartConfig = {
    value: {
      label: def?.label ?? selectedMetric.replace(/_/g, " "),
      color: "var(--chart-1)",
    },
  };

  const chartHeight = Math.max(280, barData.length * 36 + 40);

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Company Rankings</CardTitle>
            <ExportButtonGroup onPNG={async () => {
              const el = document.querySelector("[data-chart-export='sector-trends']");
              if (el instanceof HTMLElement) return exportChartAsPNG(el, "company-rankings.png");
              return false;
            }} />
            <PeriodSelector value={periodType} onValueChange={setPeriodType} />
          </div>
          {timeseriesData.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Latest {periodType === "quarterly" ? "quarter" : "year"} &middot; {barData.length} companies &middot; sorted{" "}
              {higherIsBetter ? "highest" : "lowest"} first
            </p>
          )}
        </div>
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
        {barData.length > 0 ? (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height: chartHeight }}
            data-chart-export="sector-trends"
          >
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={(v: number) =>
                  formatChartTick(v, def?.unit ?? "number")
                }
              />
              <YAxis
                type="category"
                dataKey="ticker"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground font-mono"
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatMetricValue(selectedMetric, value as number)
                    }
                  />
                }
              />
              {sectorAvg != null && (
                <ReferenceLine
                  x={sectorAvg}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Avg ${formatMetricValue(selectedMetric, sectorAvg)}`,
                    position: "top",
                    className: "text-[10px] fill-muted-foreground",
                  }}
                />
              )}
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {barData.map((entry, i) => {
                  const isBest = i === 0;
                  const isWorst = i === barData.length - 1 && barData.length > 1;
                  return (
                    <Cell
                      key={entry.ticker}
                      fill={
                        isBest
                          ? "var(--positive)"
                          : isWorst
                            ? "var(--negative)"
                            : "var(--chart-1)"
                      }
                      fillOpacity={isBest || isWorst ? 0.85 : 0.6}
                    />
                  );
                })}
              </Bar>
            </BarChart>
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
