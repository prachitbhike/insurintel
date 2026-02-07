"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
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
import { formatCurrency, formatPercent } from "@/lib/metrics/formatters";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type PCCarrierData } from "@/lib/queries/pc-dashboard";

interface CostBreakdownChartProps {
  carriers: PCCarrierData[];
  years: number[];
}

type SortMode = "premiums" | "expense" | "loss";

interface CostBreakdownItem {
  ticker: string;
  name: string;
  premiums: number;
  lossCosts: number;
  expenseCosts: number;
  uwResult: number;
  uwResultPositive: number;
  uwResultNegative: number;
  expenseRatio: number | null;
  trendDirection: "improving" | "worsening" | "flat";
}

const chartConfig = {
  lossCosts: {
    label: "Loss Costs",
    color: "hsl(220 70% 50%)",
  },
  expenseCosts: {
    label: "Expense Costs",
    color: "hsl(220 50% 70%)",
  },
  uwResultPositive: {
    label: "UW Profit",
    color: "hsl(142 60% 45%)",
  },
  uwResultNegative: {
    label: "UW Loss",
    color: "hsl(0 70% 55%)",
  },
} satisfies ChartConfig;

function getExpenseRatioTrend(
  carrier: PCCarrierData,
  years: number[]
): "improving" | "worsening" | "flat" {
  const recentYears = years.slice(-3);
  const values = recentYears
    .map((y) => carrier.metricsByYear[y]?.expense_ratio)
    .filter((v): v is number => v != null);

  if (values.length < 2) return "flat";
  const diff = values[values.length - 1] - values[0];
  if (Math.abs(diff) < 0.5) return "flat";
  return diff < 0 ? "improving" : "worsening";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CostBreakdownItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1.5 min-w-[220px]">
      <p className="font-mono font-bold text-sm">
        {d.ticker}{" "}
        <span className="font-normal text-muted-foreground">{d.name}</span>
      </p>
      <div className="border-t pt-1.5 space-y-1">
        <div className="flex justify-between">
          <span>Net Premiums</span>
          <span className="font-mono font-semibold">{formatCurrency(d.premiums)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(220 70% 50%)" }} />
            Loss Costs (Claims AI)
          </span>
          <span className="font-mono">{formatCurrency(d.lossCosts)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(220 50% 70%)" }} />
            Expense Costs (Ops AI)
          </span>
          <span className="font-mono">{formatCurrency(d.expenseCosts)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span>UW Result</span>
          <span
            className={`font-mono font-semibold ${
              d.uwResult >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {d.uwResult >= 0 ? "+" : ""}
            {formatCurrency(d.uwResult)}
          </span>
        </div>
      </div>
      {d.expenseRatio != null && (
        <p className="text-muted-foreground pt-0.5">
          Expense Ratio: {formatPercent(d.expenseRatio, 1)}
        </p>
      )}
    </div>
  );
}

function TrendIcon({ direction }: { direction: "improving" | "worsening" | "flat" }) {
  switch (direction) {
    case "worsening":
      return <TrendingUp className="h-3 w-3 text-red-500" />;
    case "improving":
      return <TrendingDown className="h-3 w-3 text-emerald-500" />;
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
}

export function CostBreakdownChart({
  carriers,
  years,
}: CostBreakdownChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("premiums");

  const data = useMemo(() => {
    const items: CostBreakdownItem[] = carriers
      .filter((c) => c.ticker !== "ERIE") // management company, no UW metrics
      .map((c) => {
        const premiums = c.latest.net_premiums_earned;
        const lossRatio = c.latest.loss_ratio;
        const expenseRatio = c.latest.expense_ratio;

        if (premiums == null || premiums <= 0) return null;
        if (lossRatio == null && expenseRatio == null) return null;

        const lossCosts = lossRatio != null ? (lossRatio / 100) * premiums : 0;
        const expenseCosts = expenseRatio != null ? (expenseRatio / 100) * premiums : 0;
        const uwResult = premiums - lossCosts - expenseCosts;

        return {
          ticker: c.ticker,
          name: c.name,
          premiums,
          lossCosts,
          expenseCosts,
          uwResult,
          uwResultPositive: uwResult >= 0 ? uwResult : 0,
          uwResultNegative: uwResult < 0 ? Math.abs(uwResult) : 0,
          expenseRatio,
          trendDirection: getExpenseRatioTrend(c, years),
        };
      })
      .filter((d): d is CostBreakdownItem => d != null);

    // Sort
    items.sort((a, b) => {
      switch (sortMode) {
        case "premiums":
          return b.premiums - a.premiums;
        case "expense":
          return b.expenseCosts - a.expenseCosts;
        case "loss":
          return b.lossCosts - a.lossCosts;
      }
    });

    return items;
  }, [carriers, years, sortMode]);

  const totals = useMemo(() => {
    const totalPremiums = data.reduce((s, d) => s + d.premiums, 0);
    const totalLosses = data.reduce((s, d) => s + d.lossCosts, 0);
    const totalExpenses = data.reduce((s, d) => s + d.expenseCosts, 0);
    return { totalPremiums, totalLosses, totalExpenses };
  }, [data]);

  const excludedTickers = useMemo(
    () => carriers.filter((c) => c.ticker === "ERIE").map((c) => c.ticker),
    [carriers]
  );

  const chartHeight = Math.max(300, data.length * 40 + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Cost Breakdown — Where Every Premium Dollar Goes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              P&C carriers collected{" "}
              <span className="font-mono font-semibold">{formatCurrency(totals.totalPremiums)}</span> in premiums:{" "}
              <span className="font-mono">{formatCurrency(totals.totalLosses)}</span> to losses,{" "}
              <span className="font-mono">{formatCurrency(totals.totalExpenses)}</span> to expenses
            </p>
          </div>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="premiums" className="text-xs">By Premiums</SelectItem>
              <SelectItem value="expense" className="text-xs">By Expense $</SelectItem>
              <SelectItem value="loss" className="text-xs">By Loss $</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 100, left: 50, bottom: 10 }}
            barSize={24}
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
              tickFormatter={(v: number) => {
                const abs = Math.abs(v);
                if (abs >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
                if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
                return `$${v}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="ticker"
              tickLine={false}
              axisLine={false}
              width={45}
              className="text-[11px] fill-muted-foreground font-mono"
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar
              dataKey="lossCosts"
              stackId="costs"
              fill="hsl(220 70% 50%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="expenseCosts"
              stackId="costs"
              fill="hsl(220 50% 70%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="uwResultPositive"
              stackId="costs"
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.ticker}
                  fill={
                    entry.uwResultPositive > 0
                      ? "hsl(142 60% 45%)"
                      : "transparent"
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="uwResultNegative"
              stackId="uw-loss"
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.ticker}
                  fill={
                    entry.uwResultNegative > 0
                      ? "hsl(0 70% 55% / 0.7)"
                      : "transparent"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Right-side annotations (expense ratio + trend) */}
        <div className="mt-2 grid gap-0.5" style={{ paddingLeft: 50 }}>
          {data.map((d) => (
            <div
              key={d.ticker}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className="font-mono w-10 text-right">
                {d.expenseRatio != null ? formatPercent(d.expenseRatio, 1) : "—"}
              </span>
              <TrendIcon direction={d.trendDirection} />
              <span className="font-mono w-8">{d.ticker}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 70% 50%)" }} />
            Loss Costs (Claims AI)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 50% 70%)" }} />
            Expense Costs (Ops AI)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(142 60% 45%)" }} />
            UW Profit
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(0 70% 55% / 0.7)" }} />
            UW Loss
          </div>
          {excludedTickers.length > 0 && (
            <span className="ml-auto">
              Excluded: {excludedTickers.join(", ")} (management company)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
