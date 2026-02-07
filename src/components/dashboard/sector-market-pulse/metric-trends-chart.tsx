"use client";

import { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPercent, formatRatio } from "@/lib/metrics/formatters";
import { type CarrierData } from "@/lib/queries/sector-dashboard";

interface MetricTrendsChartProps {
  carriers: CarrierData[];
  years: number[];
  primaryMetric: string;
  primaryLabel: string;
  secondaryMetric: string;
  secondaryLabel: string;
  higherIsWorse: boolean;
  excludeTickers?: string[];
}

type MetricMode = "primary" | "secondary";

interface TrendBarItem {
  ticker: string;
  name: string;
  changePp: number;
  currentValue: number | null;
  firstValue: number;
  lastValue: number;
  firstYear: number;
  lastYear: number;
  direction: "worsening" | "improving" | "stable";
}

const chartConfig = {
  changePp: {
    label: "Change",
    color: "hsl(220 60% 60%)",
  },
} satisfies ChartConfig;

const COLOR_WORSENING = "hsl(0 70% 55%)";
const COLOR_IMPROVING = "hsl(142 60% 45%)";
const COLOR_STABLE = "hsl(220 10% 55%)";

function buildTrendItem(
  carrier: CarrierData,
  years: number[],
  metricName: string,
  higherIsWorse: boolean,
): TrendBarItem | null {
  const yearValues: { year: number; value: number }[] = [];
  for (const y of years) {
    const yd = carrier.metricsByYear[y];
    if (yd) {
      const v = yd[metricName];
      if (v != null) yearValues.push({ year: y, value: v });
    }
  }

  if (yearValues.length < 2) return null;

  const first = yearValues[0];
  const last = yearValues[yearValues.length - 1];
  const changePp = last.value - first.value;

  let direction: "worsening" | "improving" | "stable" = "stable";
  if (higherIsWorse) {
    if (changePp > 0.5) direction = "worsening";
    else if (changePp < -0.5) direction = "improving";
  } else {
    // For metrics where higher is better (ROE, ROA), decrease = worsening
    if (changePp < -0.5) direction = "worsening";
    else if (changePp > 0.5) direction = "improving";
  }

  return {
    ticker: carrier.ticker,
    name: carrier.name,
    changePp,
    currentValue: last.value,
    firstValue: first.value,
    lastValue: last.value,
    firstYear: first.year,
    lastYear: last.year,
    direction,
  };
}

function formatValue(value: number, metricName: string): string {
  if (metricName === "debt_to_equity") return formatRatio(value, 1);
  return formatPercent(value, 1);
}

function CustomTooltip({
  active,
  payload,
  metricName,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendBarItem }>;
  metricName: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0].payload;
  const sign = item.changePp > 0 ? "+" : "";
  const isRatio = metricName === "debt_to_equity";
  const unit = isRatio ? "" : "pp";

  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs min-w-[180px]">
      <p className="font-mono font-semibold mb-1.5">
        {item.ticker} — {item.name}
      </p>
      <div className="space-y-0.5 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>FY{item.firstYear}</span>
          <span className="font-mono font-semibold text-foreground">
            {formatValue(item.firstValue, metricName)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>FY{item.lastYear}</span>
          <span className="font-mono font-semibold text-foreground">
            {formatValue(item.lastValue, metricName)}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t mt-1">
          <span>Change</span>
          <span
            className={`font-mono font-semibold ${
              item.direction === "worsening"
                ? "text-red-500"
                : item.direction === "improving"
                  ? "text-emerald-500"
                  : "text-muted-foreground"
            }`}
          >
            {sign}{item.changePp.toFixed(1)}{unit}
          </span>
        </div>
        {item.currentValue != null && (
          <div className="flex justify-between gap-4">
            <span>Current</span>
            <span className="font-mono font-semibold text-foreground">
              {formatValue(item.currentValue, metricName)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricTrendsChart({
  carriers,
  years,
  primaryMetric,
  primaryLabel,
  secondaryMetric,
  secondaryLabel,
  higherIsWorse,
  excludeTickers = [],
}: MetricTrendsChartProps) {
  const [mode, setMode] = useState<MetricMode>("primary");

  const handleModeChange = useCallback((value: string) => {
    if (value) setMode(value as MetricMode);
  }, []);

  const currentMetric = mode === "primary" ? primaryMetric : secondaryMetric;
  const currentLabel = mode === "primary" ? primaryLabel : secondaryLabel;

  // For secondary metric toggle, determine if higher is worse
  // ROE/ROA as secondary: higher is better (higherIsWorse = false)
  // loss_ratio/combined_ratio as secondary: higher is worse
  const currentHigherIsWorse = mode === "primary"
    ? higherIsWorse
    : ["expense_ratio", "loss_ratio", "combined_ratio", "medical_loss_ratio", "debt_to_equity"].includes(secondaryMetric);

  const trendItems = useMemo(() => {
    const items: TrendBarItem[] = [];
    for (const c of carriers) {
      if (excludeTickers.includes(c.ticker)) continue;
      const item = buildTrendItem(c, years, currentMetric, currentHigherIsWorse);
      if (item) items.push(item);
    }
    // Sort: worst changes first
    if (currentHigherIsWorse) {
      items.sort((a, b) => b.changePp - a.changePp);
    } else {
      items.sort((a, b) => a.changePp - b.changePp);
    }
    return items;
  }, [carriers, years, currentMetric, currentHigherIsWorse, excludeTickers]);

  const summary = useMemo(() => {
    const worsening = trendItems.filter((c) => c.direction === "worsening").length;
    const improving = trendItems.filter((c) => c.direction === "improving").length;
    const stable = trendItems.filter((c) => c.direction === "stable").length;
    return { worsening, improving, stable };
  }, [trendItems]);

  const barHeight = carriers.length <= 4 ? 48 : carriers.length <= 8 ? 36 : 28;
  const chartHeight = Math.max(250, trendItems.length * (barHeight + 8) + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              {currentLabel} Trends — Who&apos;s Getting {currentHigherIsWorse ? "Worse" : "Better"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Change from FY{years[0]} to FY{years[years.length - 1]}
              {currentMetric !== "debt_to_equity" && " (pp)"} ·{" "}
              <span className="text-red-500 font-semibold">{summary.worsening} worsening</span>,{" "}
              <span className="text-emerald-500">{summary.improving} improving</span>,{" "}
              <span>{summary.stable} stable</span>
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={handleModeChange}
            className="h-7"
          >
            <ToggleGroupItem value="primary" className="text-xs px-2 h-7">
              {primaryLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="secondary" className="text-xs px-2 h-7">
              {secondaryLabel}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <div className="flex-1 min-w-0">
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: chartHeight }}
            >
              <BarChart
                data={trendItems}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground font-mono"
                  tickFormatter={(v: number) => {
                    if (currentMetric === "debt_to_equity") {
                      const sign = v > 0 ? "+" : "";
                      return `${sign}${v.toFixed(1)}x`;
                    }
                    const sign = v > 0 ? "+" : "";
                    return `${sign}${v.toFixed(0)}pp`;
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  className="text-[11px] fill-muted-foreground font-mono"
                />
                <ReferenceLine
                  x={0}
                  className="stroke-border"
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  content={<CustomTooltip metricName={currentMetric} />}
                />
                <Bar dataKey="changePp" radius={[2, 2, 2, 2]}>
                  {trendItems.map((item) => (
                    <Cell
                      key={item.ticker}
                      fill={
                        item.direction === "worsening"
                          ? COLOR_WORSENING
                          : item.direction === "improving"
                            ? COLOR_IMPROVING
                            : COLOR_STABLE
                      }
                      fillOpacity={item.direction === "stable" ? 0.5 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Current value annotations */}
          <div
            className="flex flex-col justify-start shrink-0 pl-2"
            style={{
              paddingTop: 5,
              height: chartHeight,
            }}
          >
            <div style={{ height: 0 }} />
            <div
              className="flex flex-col"
              style={{
                flex: 1,
                justifyContent: "space-around",
              }}
            >
              {trendItems.map((item) => (
                <div
                  key={item.ticker}
                  className="text-[11px] font-mono text-muted-foreground text-right leading-none"
                >
                  {item.currentValue != null
                    ? formatValue(item.currentValue, currentMetric)
                    : "—"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Current
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
