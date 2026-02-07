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
import { formatCurrency, formatPercent, formatRatio } from "@/lib/metrics/formatters";
import { type CarrierData } from "@/lib/queries/sector-dashboard";

interface EarningsPowerChartProps {
  carriers: CarrierData[];
  years: number[];
}

type SortMode = "revenue" | "roe" | "de";

interface EarningsPowerItem {
  ticker: string;
  name: string;
  revenue: number;
  netIncome: number;
  operatingCosts: number;
  roe: number | null;
  deRatio: number | null;
}

const chartConfig = {
  netIncome: {
    label: "Net Income",
    color: "hsl(340 60% 50%)",
  },
  operatingCosts: {
    label: "Operating Costs",
    color: "hsl(340 40% 70%)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EarningsPowerItem }>;
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
          <span>Revenue</span>
          <span className="font-mono font-semibold">{formatCurrency(d.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(340 60% 50%)" }} />
            Net Income
          </span>
          <span className="font-mono">{formatCurrency(d.netIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(340 40% 70%)" }} />
            Operating Costs
          </span>
          <span className="font-mono">{formatCurrency(d.operatingCosts)}</span>
        </div>
        {d.roe != null && (
          <div className="flex justify-between border-t pt-1">
            <span>ROE</span>
            <span className="font-mono font-semibold">{formatPercent(d.roe, 1)}</span>
          </div>
        )}
        {d.deRatio != null && (
          <div className="flex justify-between">
            <span>D/E</span>
            <span className="font-mono">{formatRatio(d.deRatio, 1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EarningsPowerChart({
  carriers,
  years,
}: EarningsPowerChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("revenue");

  const data = useMemo(() => {
    const items: EarningsPowerItem[] = carriers
      .map((c) => {
        const revenue = c.latest.revenue;
        const netIncome = c.latest.net_income;

        if (revenue == null || revenue <= 0) return null;

        const ni = netIncome ?? 0;
        const operatingCosts = Math.max(0, revenue - ni);

        return {
          ticker: c.ticker,
          name: c.name,
          revenue,
          netIncome: Math.max(0, ni),
          operatingCosts,
          roe: c.latest.roe ?? null,
          deRatio: c.latest.debt_to_equity ?? null,
        };
      })
      .filter((d): d is EarningsPowerItem => d != null);

    items.sort((a, b) => {
      switch (sortMode) {
        case "revenue":
          return b.revenue - a.revenue;
        case "roe":
          return (b.roe ?? 0) - (a.roe ?? 0);
        case "de":
          return (b.deRatio ?? 0) - (a.deRatio ?? 0);
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
              Earnings Power — Revenue = Income + Costs
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {data.length} brokers · Bar length = total revenue · Income vs operating costs
            </p>
          </div>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue" className="text-xs">By Revenue</SelectItem>
              <SelectItem value="roe" className="text-xs">By ROE</SelectItem>
              <SelectItem value="de" className="text-xs">By D/E</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(340 60% 50%)" }} />
            Net Income
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(340 40% 70%)" }} />
            Operating Costs
          </div>
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
            <ChartTooltip content={<CustomTooltip />} />
            <Bar
              dataKey="netIncome"
              stackId="revenue"
              fill="hsl(340 60% 50%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="operatingCosts"
              stackId="revenue"
              fill="hsl(340 40% 70%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
