"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProspectTable, type ProspectRow } from "./prospect-table";
import { formatCurrency } from "@/lib/metrics/formatters";
import { useSectorFilter } from "@/lib/hooks/use-sector-filter";

interface OpportunitiesClientProps {
  rows: ProspectRow[];
}

const chartConfig = {
  addressableSpend: {
    label: "Expense Gap $",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function OpportunitiesClient({ rows }: OpportunitiesClientProps) {
  const { activeSector } = useSectorFilter();

  const filteredRows = useMemo(() => {
    if (!activeSector) return rows;
    return rows.filter((r) => r.sector === activeSector.name);
  }, [rows, activeSector]);

  const top10Chart = useMemo(() => {
    return [...filteredRows]
      .filter((r) => r.addressableSpend != null && r.addressableSpend > 0)
      .sort((a, b) => (b.addressableSpend ?? 0) - (a.addressableSpend ?? 0))
      .slice(0, 10)
      .map((r) => ({ ticker: r.ticker, addressableSpend: r.addressableSpend }));
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      {/* Prospect table */}
      <ProspectTable rows={filteredRows} />

      {/* Top 10 chart */}
      {top10Chart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 by Addressable Spend</CardTitle>
            <CardDescription>
              Best opportunity per company across all applicable use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full" style={{ height: 400 }}>
              <BarChart
                data={top10Chart}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 80, bottom: 0 }}
              >
                <CartesianGrid
                  horizontal={false}
                  vertical={true}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickMargin={8}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  width={80}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  }
                />
                <Bar
                  dataKey="addressableSpend"
                  fill="var(--chart-1)"
                  radius={[0, 2, 2, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
