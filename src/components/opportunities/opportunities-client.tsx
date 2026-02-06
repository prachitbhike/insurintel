"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { type Sector } from "@/types/database";

interface OpportunitiesClientProps {
  rows: ProspectRow[];
}

const ALL_SECTORS: Sector[] = ["P&C", "Life", "Health", "Reinsurance", "Brokers"];

const chartConfig = {
  addressableSpend: {
    label: "Addressable Spend",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function OpportunitiesClient({ rows }: OpportunitiesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSector = searchParams.get("sector") ?? null;
  const [sectorFilter, setSectorFilter] = useState<Sector | null>(
    initialSector as Sector | null
  );

  const filteredRows = useMemo(() => {
    if (!sectorFilter) return rows;
    return rows.filter((r) => r.sector === sectorFilter);
  }, [rows, sectorFilter]);

  const top10Chart = useMemo(() => {
    return [...filteredRows]
      .filter((r) => r.addressableSpend != null && r.addressableSpend > 0)
      .sort((a, b) => (b.addressableSpend ?? 0) - (a.addressableSpend ?? 0))
      .slice(0, 10)
      .map((r) => ({ ticker: r.ticker, addressableSpend: r.addressableSpend }));
  }, [filteredRows]);

  const handleSectorFilter = (sector: Sector | null) => {
    setSectorFilter(sector);
    const params = new URLSearchParams(searchParams.toString());
    if (sector) {
      params.set("sector", sector);
    } else {
      params.delete("sector");
    }
    router.replace(`/opportunities?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Sector filter tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => handleSectorFilter(null)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              !sectorFilter
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {ALL_SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => handleSectorFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                sectorFilter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

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
                  fill="var(--color-addressableSpend)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
