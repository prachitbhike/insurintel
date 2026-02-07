"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPercent, formatCurrency } from "@/lib/metrics/formatters";
import { type PCCarrierData } from "@/lib/queries/pc-dashboard";

interface CombinedRatioDecompositionProps {
  carriers: PCCarrierData[];
  sectorMedianCombined: number;
  years: number[];
}

type SortMode = "combined" | "loss" | "expense";
type ViewMode = "single" | "trend";

const chartConfig = {
  loss_ratio: {
    label: "Loss Ratio",
    color: "hsl(220 70% 55%)",
  },
  expense_ratio: {
    label: "Expense Ratio",
    color: "hsl(220 50% 75%)",
  },
} satisfies ChartConfig;

interface BarDataItem {
  ticker: string;
  name: string;
  loss_ratio: number | null;
  expense_ratio: number | null;
  combined_ratio: number | null;
  premiums: number | null;
  losses: number | null;
  expenses: number | null;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BarDataItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const combined =
    d.loss_ratio != null && d.expense_ratio != null
      ? d.loss_ratio + d.expense_ratio
      : d.combined_ratio;

  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
      <p className="font-mono font-bold">
        {d.ticker}{" "}
        <span className="font-normal text-muted-foreground">{d.name}</span>
      </p>
      {combined != null && (
        <p>
          Combined Ratio:{" "}
          <span className="font-mono font-semibold">
            {formatPercent(combined, 1)}
          </span>
        </p>
      )}
      {d.loss_ratio != null && (
        <p>
          Loss Ratio:{" "}
          <span className="font-mono">{formatPercent(d.loss_ratio, 1)}</span>
        </p>
      )}
      {d.expense_ratio != null && (
        <p>
          Expense Ratio:{" "}
          <span className="font-mono">{formatPercent(d.expense_ratio, 1)}</span>
        </p>
      )}
      {d.premiums != null && (
        <p className="text-muted-foreground">
          Premiums: {formatCurrency(d.premiums)}
        </p>
      )}
      {d.losses != null && (
        <p className="text-muted-foreground">
          Losses: {formatCurrency(d.losses)}
        </p>
      )}
      {d.expenses != null && (
        <p className="text-muted-foreground">
          Expenses: {formatCurrency(d.expenses)}
        </p>
      )}
    </div>
  );
}

// Trend mode: grouped bars across years per carrier
interface TrendBarItem {
  ticker: string;
  name: string;
  [key: string]: string | number | null; // e.g., "2021_loss", "2021_expense"
}

function TrendTooltip({
  active,
  payload,
  years,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendBarItem }>;
  years: number[];
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1.5">
      <p className="font-mono font-bold">
        {d.ticker}{" "}
        <span className="font-normal text-muted-foreground">{d.name}</span>
      </p>
      {years.map((y) => {
        const loss = d[`${y}_loss`] as number | null;
        const expense = d[`${y}_expense`] as number | null;
        const combined =
          loss != null && expense != null ? loss + expense : null;
        if (loss == null && expense == null) return null;
        return (
          <div key={y} className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground w-8">{y}</span>
            {combined != null && (
              <span className="font-mono font-semibold">
                {formatPercent(combined, 1)}
              </span>
            )}
            {loss != null && (
              <span className="text-muted-foreground">
                (L: {formatPercent(loss, 1)})
              </span>
            )}
            {expense != null && (
              <span className="text-muted-foreground">
                (E: {formatPercent(expense, 1)})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CombinedRatioDecomposition({
  carriers,
  sectorMedianCombined,
  years,
}: CombinedRatioDecompositionProps) {
  const latestYear = years[years.length - 1] ?? 2024;
  const [selectedYear, setSelectedYear] = useState(String(latestYear));
  const [sortMode, setSortMode] = useState<SortMode>("combined");
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  // Filter out ERIE (management company, no UW metrics)
  const filteredCarriers = useMemo(
    () => carriers.filter((c) => c.ticker !== "ERIE"),
    [carriers]
  );

  const excludedTickers = useMemo(
    () => carriers.filter((c) => c.ticker === "ERIE").map((c) => c.ticker),
    [carriers]
  );

  // Single year view data
  const singleYearData = useMemo(() => {
    const yr = Number(selectedYear);
    const items: BarDataItem[] = filteredCarriers
      .map((c) => {
        const yd = c.metricsByYear[yr];
        if (!yd) return null;
        // Must have at least expense_ratio to show
        if (yd.expense_ratio == null && yd.loss_ratio == null) return null;
        return {
          ticker: c.ticker,
          name: c.name,
          loss_ratio: yd.loss_ratio,
          expense_ratio: yd.expense_ratio,
          combined_ratio: yd.combined_ratio,
          premiums: yd.net_premiums_earned,
          losses: yd.losses_incurred,
          expenses: yd.underwriting_expenses,
        };
      })
      .filter((d): d is BarDataItem => d != null);

    // Sort
    items.sort((a, b) => {
      let av: number | null;
      let bv: number | null;
      switch (sortMode) {
        case "combined":
          av =
            a.loss_ratio != null && a.expense_ratio != null
              ? a.loss_ratio + a.expense_ratio
              : a.combined_ratio;
          bv =
            b.loss_ratio != null && b.expense_ratio != null
              ? b.loss_ratio + b.expense_ratio
              : b.combined_ratio;
          break;
        case "loss":
          av = a.loss_ratio;
          bv = b.loss_ratio;
          break;
        case "expense":
          av = a.expense_ratio;
          bv = b.expense_ratio;
          break;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av; // descending (worst at top)
    });

    return items;
  }, [filteredCarriers, selectedYear, sortMode]);

  // Trend view data
  const trendData = useMemo(() => {
    const items: TrendBarItem[] = filteredCarriers
      .map((c) => {
        const row: TrendBarItem = { ticker: c.ticker, name: c.name };
        let hasAny = false;
        for (const y of years) {
          const yd = c.metricsByYear[y];
          row[`${y}_loss`] = yd?.loss_ratio ?? null;
          row[`${y}_expense`] = yd?.expense_ratio ?? null;
          if (yd?.loss_ratio != null || yd?.expense_ratio != null)
            hasAny = true;
        }
        return hasAny ? row : null;
      })
      .filter((d): d is TrendBarItem => d != null);

    // Sort by latest year combined
    items.sort((a, b) => {
      const ay =
        ((a[`${latestYear}_loss`] as number | null) ?? 0) +
        ((a[`${latestYear}_expense`] as number | null) ?? 0);
      const by =
        ((b[`${latestYear}_loss`] as number | null) ?? 0) +
        ((b[`${latestYear}_expense`] as number | null) ?? 0);
      return by - ay;
    });

    return items;
  }, [filteredCarriers, years, latestYear]);

  const barHeight = viewMode === "single" ? 32 : 20;
  const singleChartHeight = Math.max(
    300,
    singleYearData.length * (barHeight + 8) + 60
  );
  const trendChartHeight = Math.max(
    400,
    trendData.length * years.length * (barHeight + 4) + 80
  );

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Combined Ratio Decomposition
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Stacked loss + expense ratios by carrier
              {sectorMedianCombined > 0 && (
                <>
                  {" "}
                  · Sector median:{" "}
                  <span className="font-mono">
                    {formatPercent(sectorMedianCombined, 1)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="h-7"
            >
              <ToggleGroupItem value="single" className="text-xs px-2 h-7">
                Single Year
              </ToggleGroupItem>
              <ToggleGroupItem value="trend" className="text-xs px-2 h-7">
                Trend
              </ToggleGroupItem>
            </ToggleGroup>
            {viewMode === "single" && (
              <>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        FY{y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sortMode}
                  onValueChange={(v) => setSortMode(v as SortMode)}
                >
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combined" className="text-xs">
                      By Combined
                    </SelectItem>
                    <SelectItem value="loss" className="text-xs">
                      By Loss
                    </SelectItem>
                    <SelectItem value="expense" className="text-xs">
                      By Expense
                    </SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "single" ? (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: singleChartHeight }}
          >
            <BarChart
              data={singleYearData}
              layout="vertical"
              margin={{ top: 24, right: 40, left: 50, bottom: 10 }}
              barSize={barHeight}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="2 6"
                className="stroke-border/15"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, "auto"]}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                tickLine={false}
                axisLine={false}
                width={45}
                className="text-[11px] fill-muted-foreground font-mono"
              />
              <ReferenceLine
                x={sectorMedianCombined}
                strokeDasharray="4 4"
                className="stroke-muted-foreground/50"
              >
                <Label
                  value={`Median ${formatPercent(sectorMedianCombined, 1)}`}
                  position="insideTopLeft"
                  offset={6}
                  className="text-[10px] fill-muted-foreground"
                />
              </ReferenceLine>
              <ReferenceLine
                x={100}
                strokeDasharray="3 3"
                className="stroke-red-500/50"
              >
                <Label
                  value="100%"
                  position="insideTopRight"
                  offset={6}
                  className="text-[10px] fill-red-500/70"
                />
              </ReferenceLine>
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="loss_ratio"
                stackId="combined"
                fill="hsl(220 70% 55%)"
                radius={[0, 0, 0, 0]}
              >
                {singleYearData.map((entry) => (
                  <Cell
                    key={entry.ticker}
                    fill={
                      entry.loss_ratio == null
                        ? "transparent"
                        : "hsl(220 70% 55%)"
                    }
                  />
                ))}
              </Bar>
              <Bar
                dataKey="expense_ratio"
                stackId="combined"
                fill="hsl(220 50% 75%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: trendChartHeight }}
          >
            <BarChart
              data={trendData}
              layout="vertical"
              margin={{ top: 24, right: 40, left: 50, bottom: 10 }}
              barSize={barHeight}
              barGap={1}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="2 6"
                className="stroke-border/15"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, "auto"]}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                tickLine={false}
                axisLine={false}
                width={45}
                className="text-[11px] fill-muted-foreground font-mono"
              />
              <ReferenceLine
                x={100}
                strokeDasharray="3 3"
                className="stroke-red-500/50"
              />
              <ChartTooltip
                content={<TrendTooltip years={years} />}
              />
              {years.map((y, i) => {
                const opacity = 0.4 + (i / (years.length - 1)) * 0.6;
                return (
                  <Bar
                    key={`${y}_loss`}
                    dataKey={`${y}_loss`}
                    stackId={String(y)}
                    fill={`hsl(220 70% 55% / ${opacity})`}
                    radius={[0, 0, 0, 0]}
                    name={`${y} Loss`}
                  />
                );
              })}
              {years.map((y, i) => {
                const opacity = 0.4 + (i / (years.length - 1)) * 0.6;
                return (
                  <Bar
                    key={`${y}_expense`}
                    dataKey={`${y}_expense`}
                    stackId={String(y)}
                    fill={`hsl(220 50% 75% / ${opacity})`}
                    radius={[0, 4, 4, 0]}
                    name={`${y} Expense`}
                  />
                );
              })}
            </BarChart>
          </ChartContainer>
        )}

        {/* Footnotes */}
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 70% 55%)" }} />
            Loss Ratio
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 50% 75%)" }} />
            Expense Ratio
          </div>
          {excludedTickers.length > 0 && (
            <span className="ml-auto">
              Excluded: {excludedTickers.join(", ")} (management company, no UW
              metrics)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
