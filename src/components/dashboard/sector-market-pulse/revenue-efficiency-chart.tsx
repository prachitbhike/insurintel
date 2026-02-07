"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface RevenueEfficiencyChartProps {
  carriers: CarrierData[];
  years: number[];
}

type SortMode = "revenue" | "roe" | "net_income";

interface RevenueEfficiencyItem {
  ticker: string;
  name: string;
  revenue: number;
  netIncome: number;
  roe: number | null;
  roa: number | null;
  profitMargin: number;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(175 60% 45%)",
  },
  netIncome: {
    label: "Net Income",
    color: "hsl(175 70% 35%)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenueEfficiencyItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1.5 min-w-[200px]">
      <p className="font-mono font-bold text-sm">
        {d.ticker}{" "}
        <span className="font-normal text-muted-foreground">{d.name}</span>
      </p>
      <div className="border-t pt-1.5 space-y-1">
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(175 60% 45%)" }} />
            Revenue
          </span>
          <span className="font-mono font-semibold">{formatCurrency(d.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(175 70% 35%)" }} />
            Net Income
          </span>
          <span className="font-mono">{formatCurrency(d.netIncome)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span>Profit Margin</span>
          <span className="font-mono font-semibold">{formatPercent(d.profitMargin, 1)}</span>
        </div>
        {d.roe != null && (
          <div className="flex justify-between">
            <span>ROE</span>
            <span className="font-mono">{formatPercent(d.roe, 1)}</span>
          </div>
        )}
        {d.roa != null && (
          <div className="flex justify-between">
            <span>ROA</span>
            <span className="font-mono">{formatPercent(d.roa, 1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RevenueEfficiencyChart({
  carriers,
  years,
}: RevenueEfficiencyChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("revenue");

  const data = useMemo(() => {
    const items: RevenueEfficiencyItem[] = carriers
      .map((c) => {
        const revenue = c.latest.revenue;
        const netIncome = c.latest.net_income;

        if (revenue == null || revenue <= 0) return null;

        const ni = netIncome ?? 0;
        const profitMargin = (ni / revenue) * 100;

        return {
          ticker: c.ticker,
          name: c.name,
          revenue,
          netIncome: Math.max(0, ni),
          roe: c.latest.roe ?? null,
          roa: c.latest.roa ?? null,
          profitMargin,
        };
      })
      .filter((d): d is RevenueEfficiencyItem => d != null);

    items.sort((a, b) => {
      switch (sortMode) {
        case "revenue":
          return b.revenue - a.revenue;
        case "roe":
          return (b.roe ?? 0) - (a.roe ?? 0);
        case "net_income":
          return b.netIncome - a.netIncome;
      }
    });

    return items;
  }, [carriers, sortMode]);

  void years;

  // Title has only 3 companies — wider bars
  const barSize = data.length <= 4 ? 36 : data.length <= 8 ? 28 : 24;
  const chartHeight = Math.max(250, data.length * (barSize * 2 + 24) + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Revenue Efficiency — Revenue vs Net Income
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {data.length} companies · Revenue and net income side-by-side
            </p>
          </div>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue" className="text-xs">By Revenue</SelectItem>
              <SelectItem value="roe" className="text-xs">By ROE</SelectItem>
              <SelectItem value="net_income" className="text-xs">By Net Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(175 60% 45%)" }} />
            Revenue
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(175 70% 35%)" }} />
            Net Income
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 min-w-0">
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
                barGap={4}
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
                <ChartTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="hsl(175 60% 45%)"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="netIncome"
                  fill="hsl(175 70% 35%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* ROE annotation */}
          <div
            className="flex flex-col justify-start shrink-0 pl-2"
            style={{ paddingTop: 10, height: chartHeight }}
          >
            <div style={{ height: 0 }} />
            <div
              className="flex flex-col"
              style={{ flex: 1, justifyContent: "space-around" }}
            >
              {data.map((item) => (
                <div
                  key={item.ticker}
                  className="text-[10px] font-mono text-muted-foreground text-right leading-none space-y-0.5"
                >
                  <div>{item.roe != null ? `ROE ${formatPercent(item.roe, 1)}` : "—"}</div>
                  <div>{item.roa != null ? `ROA ${formatPercent(item.roa, 1)}` : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Returns
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
