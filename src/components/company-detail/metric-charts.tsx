"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChartComponent } from "@/components/charts/area-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { type TimeseriesPoint } from "@/types/company";
import { type ChartConfig } from "@/components/ui/chart";

interface MetricChartsProps {
  timeseries: Record<string, TimeseriesPoint[]>;
  sector: string;
}

const CHART_TABS = [
  {
    value: "underwriting",
    label: "Underwriting",
    metrics: ["combined_ratio", "loss_ratio", "expense_ratio"],
    chartType: "line" as const,
    sectors: ["P&C", "Reinsurance"],
  },
  {
    value: "premiums",
    label: "Premiums",
    metrics: ["net_premiums_earned", "premium_growth_yoy"],
    chartType: "bar" as const,
    sectors: ["P&C", "Life", "Reinsurance"],
  },
  {
    value: "profitability",
    label: "Profitability",
    metrics: ["net_income", "roe", "roa"],
    chartType: "area" as const,
    sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
  },
  {
    value: "balance_sheet",
    label: "Balance Sheet",
    metrics: ["total_assets", "stockholders_equity", "debt_to_equity"],
    chartType: "bar" as const,
    sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
  },
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

export function MetricCharts({ timeseries, sector }: MetricChartsProps) {
  const applicableTabs = CHART_TABS.filter((t) => t.sectors.includes(sector));
  const [activeTab, setActiveTab] = useState(applicableTabs[0]?.value ?? "profitability");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {applicableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {applicableTabs.map((tab) => {
            const availableMetrics = tab.metrics.filter(
              (m) => timeseries[m] && timeseries[m].length > 0
            );

            // Build chart data: merge all metrics by fiscal_year
            const yearSet = new Set<number>();
            for (const m of availableMetrics) {
              for (const p of timeseries[m]) yearSet.add(p.fiscal_year);
            }
            const years = [...yearSet].sort();

            const chartData = years.map((year) => {
              const point: Record<string, string | number | null> = {
                year: String(year),
              };
              for (const m of availableMetrics) {
                const entry = timeseries[m].find(
                  (p) => p.fiscal_year === year
                );
                point[m] = entry?.value ?? null;
              }
              return point;
            });

            const config: ChartConfig = {};
            availableMetrics.forEach((m, i) => {
              config[m] = {
                label: m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                color: CHART_COLORS[i % CHART_COLORS.length],
              };
            });

            return (
              <TabsContent key={tab.value} value={tab.value}>
                {availableMetrics.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No data available for this category.
                  </p>
                ) : tab.chartType === "bar" ? (
                  <BarChartComponent
                    data={chartData}
                    xKey="year"
                    dataKeys={availableMetrics}
                    config={config}
                    height={350}
                  />
                ) : (
                  <AreaChartComponent
                    data={chartData}
                    xKey="year"
                    dataKeys={availableMetrics}
                    config={config}
                    height={350}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
