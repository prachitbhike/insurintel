"use client";

import { useMemo, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPercent } from "@/lib/metrics/formatters";
import { type PCCarrierData } from "@/lib/queries/pc-dashboard";

interface ExpenseTrendsChartProps {
  carriers: PCCarrierData[];
  years: number[];
  sectorMedianExpenseRatio: number;
}

type MetricMode = "expense" | "loss";

interface TrendClassification {
  ticker: string;
  name: string;
  direction: "worsening" | "improving" | "stable";
  changePp: number;
}

const chartConfig = {
  expense_ratio: {
    label: "Expense Ratio",
    color: "hsl(220 60% 60%)",
  },
  loss_ratio: {
    label: "Loss Ratio",
    color: "hsl(220 70% 50%)",
  },
} satisfies ChartConfig;

const CARRIER_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  "hsl(220 70% 50%)",
  "hsl(0 70% 55%)",
  "hsl(142 60% 45%)",
  "hsl(280 60% 55%)",
  "hsl(30 80% 50%)",
  "hsl(190 70% 45%)",
  "hsl(340 65% 50%)",
  "hsl(60 70% 40%)",
  "hsl(160 50% 45%)",
  "hsl(250 55% 55%)",
  "hsl(10 75% 50%)",
  "hsl(200 65% 50%)",
  "hsl(320 60% 50%)",
  "hsl(100 50% 40%)",
  "hsl(40 70% 45%)",
  "hsl(170 55% 40%)",
  "hsl(270 50% 50%)",
  "hsl(350 60% 45%)",
];

function getCarrierColor(ticker: string, index: number): string {
  if (!CARRIER_COLORS[ticker]) {
    CARRIER_COLORS[ticker] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  }
  return CARRIER_COLORS[ticker];
}

function classifyTrend(
  carrier: PCCarrierData,
  years: number[],
  mode: MetricMode
): TrendClassification {
  const metric = mode === "expense" ? "expense_ratio" : "loss_ratio";
  const values = years
    .map((y) => {
      const yd = carrier.metricsByYear[y];
      return yd ? (yd as unknown as Record<string, number | null>)[metric] ?? null : null;
    })
    .filter((v): v is number => v != null);

  let changePp = 0;
  let direction: "worsening" | "improving" | "stable" = "stable";

  if (values.length >= 2) {
    changePp = values[values.length - 1] - values[0];
    if (changePp > 0.5) direction = "worsening";
    else if (changePp < -0.5) direction = "improving";
  }

  return {
    ticker: carrier.ticker,
    name: carrier.name,
    direction,
    changePp,
  };
}

function CustomTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  mode: MetricMode;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const metricLabel = mode === "expense" ? "Expense Ratio" : "Loss Ratio";

  // Filter to entries with values and sort descending
  const entries = payload
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs max-h-[300px] overflow-y-auto">
      <p className="font-mono font-semibold mb-1.5">
        FY{label} — {metricLabel}
      </p>
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-mono">{entry.name}</span>
            </span>
            <span className="font-mono font-semibold ml-3">
              {formatPercent(entry.value, 1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpenseTrendsChart({
  carriers,
  years,
  sectorMedianExpenseRatio,
}: ExpenseTrendsChartProps) {
  const [mode, setMode] = useState<MetricMode>("expense");

  const handleModeChange = useCallback((value: string) => {
    if (value) setMode(value as MetricMode);
  }, []);

  const metric = mode === "expense" ? "expense_ratio" : "loss_ratio";

  // Filter carriers that have at least 2 data points for the selected metric
  const validCarriers = useMemo(
    () =>
      carriers.filter((c) => {
        if (c.ticker === "ERIE") return false; // management company
        const count = years.filter((y) => {
          const yd = c.metricsByYear[y];
          return yd && (yd as unknown as Record<string, number | null>)[metric] != null;
        }).length;
        return count >= 2;
      }),
    [carriers, years, metric]
  );

  const classifications = useMemo(
    () => validCarriers.map((c) => classifyTrend(c, years, mode)),
    [validCarriers, years, mode]
  );

  const summary = useMemo(() => {
    const worsening = classifications.filter((c) => c.direction === "worsening").length;
    const improving = classifications.filter((c) => c.direction === "improving").length;
    const stable = classifications.filter((c) => c.direction === "stable").length;
    return { worsening, improving, stable };
  }, [classifications]);

  // Build chart data: one point per year, each carrier as a key
  const chartData = useMemo(
    () =>
      years.map((y) => {
        const point: Record<string, number | string | null> = { year: String(y) };
        for (const c of validCarriers) {
          const yd = c.metricsByYear[y];
          point[c.ticker] =
            yd ? (yd as unknown as Record<string, number | null>)[metric] ?? null : null;
        }
        return point;
      }),
    [years, validCarriers, metric]
  );

  // Compute median for reference line (latest year across valid carriers)
  const medianValue = useMemo(() => {
    if (mode === "expense") return sectorMedianExpenseRatio;
    // Compute loss ratio median
    const latestYear = years[years.length - 1];
    const values = validCarriers
      .map((c) => c.metricsByYear[latestYear]?.loss_ratio)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    if (values.length === 0) return 65;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0
      ? values[mid]
      : (values[mid - 1] + values[mid]) / 2;
  }, [mode, sectorMedianExpenseRatio, years, validCarriers]);

  const classMap = useMemo(() => {
    const m = new Map<string, TrendClassification>();
    for (const c of classifications) m.set(c.ticker, c);
    return m;
  }, [classifications]);

  const metricLabel = mode === "expense" ? "Expense Ratio" : "Loss Ratio";

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              {metricLabel} Trends — Who&apos;s Getting Worse
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              FY{years[0]}–FY{years[years.length - 1]} trajectories ·{" "}
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
            <ToggleGroupItem value="expense" className="text-xs px-2 h-7">
              Expense Ratio
            </ToggleGroupItem>
            <ToggleGroupItem value="loss" className="text-xs px-2 h-7">
              Loss Ratio
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: 400 }}
        >
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="2 6"
              className="stroke-border/15"
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              className="text-[11px] fill-muted-foreground font-mono"
              tickFormatter={(v: string) => `FY${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-[11px] fill-muted-foreground"
              tickFormatter={(v: number) => `${v}%`}
              domain={["auto", "auto"]}
            />
            <ReferenceLine
              y={medianValue}
              strokeDasharray="4 4"
              className="stroke-muted-foreground/40"
            >
              <Label
                value={`Median ${formatPercent(medianValue, 1)}`}
                position="insideTopLeft"
                offset={6}
                className="text-[10px] fill-muted-foreground"
              />
            </ReferenceLine>
            <ChartTooltip
              content={<CustomTooltip mode={mode} />}
            />
            {validCarriers.map((c, i) => {
              const cls = classMap.get(c.ticker);
              const direction = cls?.direction ?? "stable";

              let strokeColor: string;
              let strokeOpacity: number;
              let strokeWidth: number;

              switch (direction) {
                case "worsening":
                  strokeColor = getCarrierColor(c.ticker, i);
                  strokeOpacity = 1;
                  strokeWidth = 2.5;
                  break;
                case "improving":
                  strokeColor = "hsl(142 60% 45%)";
                  strokeOpacity = 0.4;
                  strokeWidth = 1.5;
                  break;
                default:
                  strokeColor = "hsl(220 10% 55%)";
                  strokeOpacity = 0.15;
                  strokeWidth = 1.5;
                  break;
              }

              return (
                <Line
                  key={c.ticker}
                  type="monotone"
                  dataKey={c.ticker}
                  name={c.ticker}
                  stroke={strokeColor}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={strokeWidth}
                  dot={direction === "worsening" ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ChartContainer>

        {/* Worsening carriers legend */}
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Worsening ({">"}+0.5pp)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {classifications
              .filter((c) => c.direction === "worsening")
              .sort((a, b) => b.changePp - a.changePp)
              .map((c, i) => {
                const carrierIndex = validCarriers.findIndex((vc) => vc.ticker === c.ticker);
                return (
                  <div key={c.ticker} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="h-2 w-6 rounded-sm"
                      style={{ backgroundColor: getCarrierColor(c.ticker, carrierIndex >= 0 ? carrierIndex : i) }}
                    />
                    <span className="font-mono">{c.ticker}</span>
                    <span className="text-red-500 font-mono">
                      +{c.changePp.toFixed(1)}pp
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
