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

interface MLRBreakdownChartProps {
  carriers: CarrierData[];
  years: number[];
}

type SortMode = "mlr" | "premiums" | "admin_margin";

interface MLRBreakdownItem {
  ticker: string;
  name: string;
  premiums: number;
  medicalClaims: number;
  adminMargin: number;
  mlr: number;
  adminMarginPct: number;
}

const chartConfig = {
  medicalClaims: {
    label: "Medical Claims (MLR)",
    color: "hsl(270 60% 55%)",
  },
  adminMargin: {
    label: "Admin Margin",
    color: "hsl(270 40% 75%)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MLRBreakdownItem }>;
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
          <span>Net Premiums Earned</span>
          <span className="font-mono font-semibold">{formatCurrency(d.premiums)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(270 60% 55%)" }} />
            Medical Claims
          </span>
          <span className="font-mono">{formatCurrency(d.medicalClaims)}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "hsl(270 40% 75%)" }} />
            Admin Margin
          </span>
          <span className="font-mono">{formatCurrency(d.adminMargin)}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span>MLR</span>
          <span className="font-mono font-semibold">{formatPercent(d.mlr, 1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Admin Margin %</span>
          <span className="font-mono">{formatPercent(d.adminMarginPct, 1)}</span>
        </div>
      </div>
      <p className="text-muted-foreground pt-0.5 text-[10px]">
        ACA requires 80-85% MLR floor — lower MLR = more admin margin for AI/ops
      </p>
    </div>
  );
}

export function MLRBreakdownChart({
  carriers,
  years,
}: MLRBreakdownChartProps) {
  const [sortMode, setSortMode] = useState<SortMode>("mlr");

  const data = useMemo(() => {
    const items: MLRBreakdownItem[] = carriers
      .map((c) => {
        const mlr = c.latest.medical_loss_ratio;
        // Use net_premiums_earned as denominator (not revenue — avoids PBM distortion)
        const premiums = c.latest.net_premiums_earned;

        if (mlr == null || premiums == null || premiums <= 0) return null;

        const medicalClaims = (mlr / 100) * premiums;
        const adminMargin = premiums - medicalClaims;
        const adminMarginPct = 100 - mlr;

        return {
          ticker: c.ticker,
          name: c.name,
          premiums,
          medicalClaims,
          adminMargin: Math.max(0, adminMargin),
          mlr,
          adminMarginPct,
        };
      })
      .filter((d): d is MLRBreakdownItem => d != null);

    items.sort((a, b) => {
      switch (sortMode) {
        case "mlr":
          return b.mlr - a.mlr;
        case "premiums":
          return b.premiums - a.premiums;
        case "admin_margin":
          return b.adminMargin - a.adminMargin;
      }
    });

    return items;
  }, [carriers, sortMode]);

  const totals = useMemo(() => {
    const totalPremiums = data.reduce((s, d) => s + d.premiums, 0);
    const totalClaims = data.reduce((s, d) => s + d.medicalClaims, 0);
    const totalAdmin = data.reduce((s, d) => s + d.adminMargin, 0);
    return { totalPremiums, totalClaims, totalAdmin };
  }, [data]);

  void years;

  const barSize = data.length <= 4 ? 36 : data.length <= 8 ? 28 : 24;
  const chartHeight = Math.max(250, data.length * (barSize + 16) + 80);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              MLR Breakdown — Medical Claims vs Admin Margin
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totals.totalPremiums)} in premiums:{" "}
              <span className="font-mono">{formatCurrency(totals.totalClaims)}</span> to medical claims,{" "}
              <span className="font-mono">{formatCurrency(totals.totalAdmin)}</span> admin margin
            </p>
          </div>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mlr" className="text-xs">By MLR</SelectItem>
              <SelectItem value="premiums" className="text-xs">By Premiums</SelectItem>
              <SelectItem value="admin_margin" className="text-xs">By Admin Margin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(270 60% 55%)" }} />
            Medical Claims (MLR portion)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "hsl(270 40% 75%)" }} />
            Admin Margin (100% − MLR)
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
              dataKey="medicalClaims"
              stackId="costs"
              fill="hsl(270 60% 55%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="adminMargin"
              stackId="costs"
              fill="hsl(270 40% 75%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
