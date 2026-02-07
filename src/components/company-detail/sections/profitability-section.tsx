"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type TimeseriesPoint } from "@/types/company";
import { formatPercent, formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";

interface ProfitabilitySectionProps {
  timeseries: Record<string, TimeseriesPoint[]>;
  sector: string;
  sectorAvgs: Record<string, number | null>;
}

const waterfallConfig: ChartConfig = {
  loss_ratio: {
    label: "Loss Ratio",
    color: "hsl(0 72% 60%)",
  },
  expense_ratio: {
    label: "Expense Ratio",
    color: "hsl(45 93% 47%)",
  },
};

const healthConfig: ChartConfig = {
  medical_loss_ratio: {
    label: "Medical Loss Ratio",
    color: "hsl(263 70% 50%)",
  },
};

const healthBarConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(263 70% 50%)",
  },
  medical_claims_expense: {
    label: "Medical Claims",
    color: "hsl(0 72% 60%)",
  },
};

export function ProfitabilitySection({
  timeseries,
  sector,
  sectorAvgs,
}: ProfitabilitySectionProps) {
  if (sector === "Life" || sector === "Brokers" || sector === "Title") return null;

  if (sector === "Health") {
    return <HealthMarginAnalysis timeseries={timeseries} sectorAvgs={sectorAvgs} />;
  }

  // P&C, Reinsurance, or Mortgage Insurance: waterfall + stacked area
  return <PCWaterfallAndTrend timeseries={timeseries} sectorAvgs={sectorAvgs} />;
}

function PCWaterfallAndTrend({
  timeseries,
  sectorAvgs,
}: {
  timeseries: Record<string, TimeseriesPoint[]>;
  sectorAvgs: Record<string, number | null>;
}) {
  // Build annual data for waterfall
  const lossData = (timeseries["loss_ratio"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );
  const expenseData = (timeseries["expense_ratio"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );

  const years = [
    ...new Set([
      ...lossData.map((d) => d.fiscal_year),
      ...expenseData.map((d) => d.fiscal_year),
    ]),
  ].sort();

  const lossMap = new Map(lossData.map((d) => [d.fiscal_year, d.value]));
  const expenseMap = new Map(expenseData.map((d) => [d.fiscal_year, d.value]));

  const waterfallData = years.map((year) => ({
    year: `FY${year}`,
    loss_ratio: lossMap.get(year) ?? 0,
    expense_ratio: expenseMap.get(year) ?? 0,
  }));

  const sectorAvgCR = sectorAvgs["combined_ratio"] ?? null;

  if (waterfallData.length === 0) {
    return (
      <Card className="rounded-sm terminal-surface">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No underwriting data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Profitability Deep Dive
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Panel A: Combined Ratio Waterfall (stacked bar) */}
        <Card className="rounded-sm terminal-surface">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Combined Ratio Breakdown</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Loss + expense ratio stacked by year. Below 100% = underwriting
              profit.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ChartContainer
              config={waterfallConfig}
              className="w-full"
              style={{ height: 260 }}
            >
              <BarChart
                data={waterfallData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="2 6"
                  className="stroke-border/15"
                />
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
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const v = value as number;
                        const label =
                          name === "loss_ratio"
                            ? "Loss Ratio"
                            : "Expense Ratio";
                        return `${label}: ${v.toFixed(1)}%`;
                      }}
                    />
                  }
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: "100%",
                    position: "right",
                    className: "text-[10px] fill-muted-foreground",
                  }}
                />
                {sectorAvgCR != null && (
                  <ReferenceLine
                    y={sectorAvgCR}
                    stroke="var(--chart-3)"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Sector ${sectorAvgCR.toFixed(1)}%`,
                      position: "right",
                      className: "text-[10px] fill-muted-foreground",
                    }}
                  />
                )}
                <Bar
                  dataKey="loss_ratio"
                  stackId="cr"
                  fill="hsl(0 72% 60%)"
                  fillOpacity={0.8}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="expense_ratio"
                  stackId="cr"
                  fill="hsl(45 93% 47%)"
                  fillOpacity={0.8}
                  radius={[2, 2, 0, 0]}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Panel B: Combined Ratio Trend (stacked area) */}
        <Card className="rounded-sm terminal-surface">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Combined Ratio Trend</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Loss ratio (bottom) + expense ratio (stacked) over time.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ChartContainer
              config={waterfallConfig}
              className="w-full"
              style={{ height: 260 }}
            >
              <AreaChart
                data={waterfallData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id="gradLoss"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(0 72% 60%)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(0 72% 60%)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient
                    id="gradExpense"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(45 93% 47%)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(45 93% 47%)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="2 6"
                  className="stroke-border/15"
                />
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
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const v = value as number;
                        const label =
                          name === "loss_ratio"
                            ? "Loss Ratio"
                            : "Expense Ratio";
                        return `${label}: ${v.toFixed(1)}%`;
                      }}
                    />
                  }
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <Area
                  type="monotone"
                  dataKey="loss_ratio"
                  stackId="cr"
                  stroke="hsl(0 72% 60%)"
                  fill="url(#gradLoss)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expense_ratio"
                  stackId="cr"
                  stroke="hsl(45 93% 47%)"
                  fill="url(#gradExpense)"
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HealthMarginAnalysis({
  timeseries,
  sectorAvgs,
}: {
  timeseries: Record<string, TimeseriesPoint[]>;
  sectorAvgs: Record<string, number | null>;
}) {
  const mlrData = (timeseries["medical_loss_ratio"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );
  const revenueData = (timeseries["revenue"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );
  const claimsData = (timeseries["medical_claims_expense"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );

  const mlrYears = mlrData
    .map((d) => d.fiscal_year)
    .sort();
  const mlrChartData = mlrYears.map((year) => ({
    year: `FY${year}`,
    medical_loss_ratio: mlrData.find((d) => d.fiscal_year === year)?.value ?? 0,
  }));

  const barYears = [
    ...new Set([
      ...revenueData.map((d) => d.fiscal_year),
      ...claimsData.map((d) => d.fiscal_year),
    ]),
  ].sort();
  const revMap = new Map(revenueData.map((d) => [d.fiscal_year, d.value]));
  const claimsMap = new Map(claimsData.map((d) => [d.fiscal_year, d.value]));
  const barChartData = barYears.map((year) => ({
    year: `FY${year}`,
    revenue: revMap.get(year) ?? 0,
    medical_claims_expense: claimsMap.get(year) ?? 0,
  }));

  const sectorAvgMLR = sectorAvgs["medical_loss_ratio"] ?? null;

  if (mlrChartData.length === 0 && barChartData.length === 0) {
    return (
      <Card className="rounded-sm terminal-surface">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No health margin data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Margin Analysis
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {mlrChartData.length > 0 && (
          <Card className="rounded-sm terminal-surface">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Medical Loss Ratio Trend</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                MLR relative to ACA 85% floor. Gap above = admin margin.
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChartContainer
                config={healthConfig}
                className="w-full"
                style={{ height: 260 }}
              >
                <AreaChart
                  data={mlrChartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="gradMLR"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(263 70% 50%)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(263 70% 50%)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="2 6"
                    className="stroke-border/15"
                  />
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
                    tickFormatter={(v: number) => `${v}%`}
                    domain={["auto", "auto"]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          const v = value as number;
                          const adminMargin = (100 - v).toFixed(1);
                          return `MLR: ${v.toFixed(1)}% (${adminMargin}% admin margin)`;
                        }}
                      />
                    }
                  />
                  <ReferenceLine
                    y={85}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: "ACA 85%",
                      position: "right",
                      className: "text-[10px] fill-muted-foreground",
                    }}
                  />
                  {sectorAvgMLR != null && (
                    <ReferenceLine
                      y={sectorAvgMLR}
                      stroke="var(--chart-3)"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Sector ${sectorAvgMLR.toFixed(1)}%`,
                        position: "right",
                        className: "text-[10px] fill-muted-foreground",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="medical_loss_ratio"
                    stroke="hsl(263 70% 50%)"
                    fill="url(#gradMLR)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {barChartData.length > 0 && (
          <Card className="rounded-sm terminal-surface">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">
                Revenue vs Medical Claims
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                The gap represents admin margin + profit.
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChartContainer
                config={healthBarConfig}
                className="w-full"
                style={{ height: 260 }}
              >
                <BarChart
                  data={barChartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="2 6"
                    className="stroke-border/15"
                  />
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
                    tickFormatter={(v: number) => {
                      if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
                      if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
                      return `$${v}`;
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          const v = value as number;
                          const label =
                            name === "revenue"
                              ? "Revenue"
                              : "Medical Claims";
                          return `${label}: ${formatCurrency(v)}`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(263 70% 50%)"
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="medical_claims_expense"
                    fill="hsl(0 72% 60%)"
                    fillOpacity={0.7}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={40}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
