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
import { type CarrierData } from "@/lib/queries/sector-dashboard";

interface UWCostBreakdownChartProps {
  carriers: CarrierData[];
  sectorLabel: string;
  excludeTickers?: string[];
  allowNegativeLoss?: boolean;
}

type SortMode = "premiums" | "expense_ratio" | "loss_ratio";

interface CostBreakdownItem {
  ticker: string;
  name: string;
  premiums: number;
  lossCosts: number;
  expenseCosts: number;
  uwResult: number;
  uwResultPositive: number;
  uwResultNegative: number;
  lossRatio: number | null;
  expenseRatio: number | null;
  hasNegativeLoss: boolean;
  negativeLossCosts: number;
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
  negativeLossCosts: {
    label: "Reserve Release",
    color: "hsl(185 60% 50%)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
  allowNegativeLoss,
}: {
  active?: boolean;
  payload?: Array<{ payload: CostBreakdownItem }>;
  allowNegativeLoss?: boolean;
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
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: d.hasNegativeLoss ? "hsl(185 60% 50%)" : "hsl(220 70% 50%)" }} />
            {d.hasNegativeLoss ? "Reserve Releases" : "Loss Costs"}
          </span>
          <span className="font-mono">{formatCurrency(d.lossCosts)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(220 50% 70%)" }} />
            Expense Costs
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
      {allowNegativeLoss && d.hasNegativeLoss && (
        <p className="text-cyan-600 dark:text-cyan-400 pt-0.5 text-[10px]">
          Negative loss ratio indicates reserve releases (prior year reserves reduced)
        </p>
      )}
    </div>
  );
}

export function UWCostBreakdownChart({
  carriers,
  sectorLabel,
  excludeTickers = [],
  allowNegativeLoss = false,
}: UWCostBreakdownChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("premiums");

  const data = useMemo(() => {
    const items: CostBreakdownItem[] = carriers
      .filter((c) => !excludeTickers.includes(c.ticker))
      .map((c) => {
        const premiums = c.latest.net_premiums_earned;
        const lossRatio = c.latest.loss_ratio;
        const expenseRatio = c.latest.expense_ratio;

        if (premiums == null || premiums <= 0) return null;
        if (lossRatio == null && expenseRatio == null) return null;

        const hasNegativeLoss = lossRatio != null && lossRatio < 0;
        const lossCosts = lossRatio != null ? (lossRatio / 100) * premiums : 0;
        const expenseCosts = expenseRatio != null ? (expenseRatio / 100) * premiums : 0;
        const uwResult = premiums - lossCosts - expenseCosts;

        return {
          ticker: c.ticker,
          name: c.name,
          premiums,
          lossCosts: hasNegativeLoss && allowNegativeLoss ? 0 : Math.max(0, lossCosts),
          expenseCosts,
          uwResult,
          uwResultPositive: uwResult >= 0 ? uwResult : 0,
          uwResultNegative: uwResult < 0 ? Math.abs(uwResult) : 0,
          lossRatio,
          expenseRatio,
          hasNegativeLoss,
          negativeLossCosts: hasNegativeLoss && allowNegativeLoss ? Math.abs(lossCosts) : 0,
        };
      })
      .filter((d): d is CostBreakdownItem => d != null);

    items.sort((a, b) => {
      switch (sortMode) {
        case "premiums":
          return b.premiums - a.premiums;
        case "expense_ratio":
          return (b.expenseRatio ?? 0) - (a.expenseRatio ?? 0);
        case "loss_ratio":
          return (b.lossRatio ?? 0) - (a.lossRatio ?? 0);
      }
    });

    return items;
  }, [carriers, sortMode, excludeTickers, allowNegativeLoss]);

  const totals = useMemo(() => {
    const totalPremiums = data.reduce((s, d) => s + d.premiums, 0);
    const totalLosses = data.reduce((s, d) => s + d.lossCosts, 0);
    const totalExpenses = data.reduce((s, d) => s + d.expenseCosts, 0);
    return { totalPremiums, totalLosses, totalExpenses };
  }, [data]);

  const barSize = carriers.length <= 4 ? 36 : carriers.length <= 8 ? 28 : 24;
  const chartHeight = Math.max(250, data.length * (barSize + 16) + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Cost Breakdown — Where Every Premium Dollar Goes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {sectorLabel} collected{" "}
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
              <SelectItem value="expense_ratio" className="text-xs">By Expense Ratio</SelectItem>
              <SelectItem value="loss_ratio" className="text-xs">By Loss Ratio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 70% 50%)" }} />
            Loss Costs
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(220 50% 70%)" }} />
            Expense Costs
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(142 60% 45%)" }} />
            UW Profit
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(0 70% 55% / 0.7)" }} />
            UW Loss
          </div>
          {allowNegativeLoss && data.some((d) => d.hasNegativeLoss) && (
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(185 60% 50%)" }} />
              Reserve Release
            </div>
          )}
          {excludeTickers.length > 0 && (
            <span className="ml-auto">
              Excluded: {excludeTickers.join(", ")}
            </span>
          )}
        </div>

        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 0, bottom: 10 }}
            barSize={barSize}
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
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={150}
              tickMargin={2}
              className="text-[11px] fill-muted-foreground"
              tickFormatter={(v: string) =>
                v.length > 22 ? v.slice(0, 20) + "…" : v
              }
            />
            <ChartTooltip content={<CustomTooltip allowNegativeLoss={allowNegativeLoss} />} />
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
            {allowNegativeLoss && (
              <Bar
                dataKey="negativeLossCosts"
                stackId="costs"
                radius={[0, 0, 0, 0]}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.ticker}
                    fill={
                      entry.negativeLossCosts > 0
                        ? "hsl(185 60% 50%)"
                        : "transparent"
                    }
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
