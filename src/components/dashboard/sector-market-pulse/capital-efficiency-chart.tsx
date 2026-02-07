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
import { formatPercent, formatCurrency } from "@/lib/metrics/formatters";
import { type CarrierData } from "@/lib/queries/sector-dashboard";

interface CapitalEfficiencyChartProps {
  carriers: CarrierData[];
  years: number[];
}

type SortMode = "roe" | "total_assets" | "net_income";

interface CapitalEfficiencyItem {
  ticker: string;
  name: string;
  roe: number;
  roa: number | null;
  totalAssets: number | null;
  netIncome: number | null;
  roeQuartile: "top" | "upper" | "lower" | "bottom";
}

const chartConfig = {
  roe: {
    label: "ROE",
    color: "hsl(160 60% 45%)",
  },
  roa: {
    label: "ROA",
    color: "hsl(160 40% 70%)",
  },
} satisfies ChartConfig;

function getQuartileColor(quartile: string): string {
  switch (quartile) {
    case "top": return "hsl(142 60% 45%)";
    case "upper": return "hsl(142 45% 55%)";
    case "lower": return "hsl(38 70% 50%)";
    case "bottom": return "hsl(0 60% 55%)";
    default: return "hsl(220 10% 55%)";
  }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CapitalEfficiencyItem }>;
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
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: getQuartileColor(d.roeQuartile) }} />
            ROE
          </span>
          <span className="font-mono font-semibold">{formatPercent(d.roe, 1)}</span>
        </div>
        {d.roa != null && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(160 40% 70%)" }} />
              ROA
            </span>
            <span className="font-mono">{formatPercent(d.roa, 1)}</span>
          </div>
        )}
        {d.totalAssets != null && (
          <div className="flex justify-between border-t pt-1">
            <span>Total Assets</span>
            <span className="font-mono font-semibold">{formatCurrency(d.totalAssets)}</span>
          </div>
        )}
        {d.netIncome != null && (
          <div className="flex justify-between">
            <span>Net Income</span>
            <span className="font-mono">{formatCurrency(d.netIncome)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CapitalEfficiencyChart({
  carriers,
  years,
}: CapitalEfficiencyChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("roe");

  const data = useMemo(() => {
    // Compute quartile boundaries
    const roeValues = carriers
      .map((c) => c.latest.roe)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);

    const q1 = roeValues.length >= 4 ? roeValues[Math.floor(roeValues.length * 0.25)] : 0;
    const q2 = roeValues.length >= 4 ? roeValues[Math.floor(roeValues.length * 0.5)] : 0;
    const q3 = roeValues.length >= 4 ? roeValues[Math.floor(roeValues.length * 0.75)] : 0;

    const items: CapitalEfficiencyItem[] = carriers
      .map((c) => {
        const roe = c.latest.roe;
        if (roe == null) return null;

        let roeQuartile: "top" | "upper" | "lower" | "bottom";
        if (roe >= q3) roeQuartile = "top";
        else if (roe >= q2) roeQuartile = "upper";
        else if (roe >= q1) roeQuartile = "lower";
        else roeQuartile = "bottom";

        return {
          ticker: c.ticker,
          name: c.name,
          roe,
          roa: c.latest.roa ?? null,
          totalAssets: c.latest.total_assets ?? null,
          netIncome: c.latest.net_income ?? null,
          roeQuartile,
        };
      })
      .filter((d): d is CapitalEfficiencyItem => d != null);

    items.sort((a, b) => {
      switch (sortMode) {
        case "roe":
          return b.roe - a.roe;
        case "total_assets":
          return (b.totalAssets ?? 0) - (a.totalAssets ?? 0);
        case "net_income":
          return (b.netIncome ?? 0) - (a.netIncome ?? 0);
      }
    });

    return items;
  }, [carriers, sortMode]);

  void years;

  const barSize = data.length <= 4 ? 36 : data.length <= 8 ? 28 : 24;
  const chartHeight = Math.max(250, data.length * (barSize + 16) + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Capital Efficiency — ROE vs ROA
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {data.length} companies · ROE colored by quartile · ROA shown as secondary bar
            </p>
          </div>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roe" className="text-xs">By ROE</SelectItem>
              <SelectItem value="total_assets" className="text-xs">By Total Assets</SelectItem>
              <SelectItem value="net_income" className="text-xs">By Net Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(142 60% 45%)" }} />
            ROE (top quartile)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(142 45% 55%)" }} />
            ROE (upper)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(38 70% 50%)" }} />
            ROE (lower)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(0 60% 55%)" }} />
            ROE (bottom)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(160 40% 70%)" }} />
            ROA
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
                margin={{ top: 10, right: 20, left: 5, bottom: 10 }}
                barSize={barSize / 2}
                barGap={2}
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
                  className="text-[11px] fill-muted-foreground font-mono"
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  className="text-[11px] fill-muted-foreground font-mono"
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  content={<CustomTooltip />}
                />
                <Bar dataKey="roe" radius={[0, 3, 3, 0]}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.ticker}
                      fill={getQuartileColor(entry.roeQuartile)}
                    />
                  ))}
                </Bar>
                <Bar dataKey="roa" fill="hsl(160 40% 70%)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Assets annotation */}
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
                  className="text-[10px] font-mono text-muted-foreground text-right leading-none"
                >
                  {item.totalAssets != null
                    ? formatCurrency(item.totalAssets)
                    : "—"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Total Assets
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
