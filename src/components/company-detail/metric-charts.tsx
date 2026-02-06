"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartComponent } from "@/components/charts/line-chart";
import { AreaChartComponent } from "@/components/charts/area-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { type TimeseriesPoint } from "@/types/company";
import { type ChartConfig } from "@/components/ui/chart";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue, formatChartTick, periodLabel, periodSortKey } from "@/lib/metrics/formatters";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { exportChartAsPNG } from "@/lib/export/chart-png";

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

const UNIT_LABELS: Record<string, string> = {
  currency: "USD",
  percent: "%",
  ratio: "Ratio",
  per_share: "Per Share",
  number: "",
};

/** Group metrics by their unit type so same-scale metrics share a chart */
function groupByUnit(metricNames: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const m of metricNames) {
    const unit = METRIC_DEFINITIONS[m]?.unit ?? "number";
    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit)!.push(m);
  }
  return groups;
}

export function MetricCharts({ timeseries, sector }: MetricChartsProps) {
  const applicableTabs = CHART_TABS.filter((t) => t.sectors.includes(sector));
  const [activeTab, setActiveTab] = useState(applicableTabs[0]?.value ?? "profitability");
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">("annual");

  const handlePNG = async () => {
    const el = document.querySelector("[data-chart-export='metric-charts']");
    if (el instanceof HTMLElement) return exportChartAsPNG(el, "historical-trends.png");
    return false;
  };

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Historical Trends</CardTitle>
          <ExportButtonGroup onPNG={handlePNG} />
        </div>
        <PeriodSelector value={periodType} onValueChange={setPeriodType} />
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} data-chart-export="metric-charts">
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

            if (availableMetrics.length === 0) {
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No data available for this category.
                  </p>
                </TabsContent>
              );
            }

            // Group metrics by unit type
            const unitGroups = groupByUnit(availableMetrics);
            const isSingleGroup = unitGroups.size === 1;

            return (
              <TabsContent key={tab.value} value={tab.value}>
                <div className={isSingleGroup ? "" : "grid gap-4 md:grid-cols-2"}>
                  {[...unitGroups.entries()].map(([unit, metrics]) => {
                    // Filter timeseries points by period type
                    const filteredTs: Record<string, TimeseriesPoint[]> = {};
                    for (const m of metrics) {
                      filteredTs[m] = (timeseries[m] ?? []).filter((p) =>
                        periodType === "annual"
                          ? p.fiscal_quarter == null
                          : p.fiscal_quarter != null
                      );
                    }

                    // Build chart data: merge metrics by period
                    const periodSet = new Set<string>();
                    const sortKeys = new Map<string, number>();
                    for (const m of metrics) {
                      for (const p of filteredTs[m]) {
                        const label = periodLabel(p.fiscal_year, p.fiscal_quarter);
                        periodSet.add(label);
                        sortKeys.set(label, periodSortKey(p.fiscal_year, p.fiscal_quarter));
                      }
                    }
                    const periods = [...periodSet].sort(
                      (a, b) => (sortKeys.get(a) ?? 0) - (sortKeys.get(b) ?? 0)
                    );

                    const chartData = periods.map((period) => {
                      const point: Record<string, string | number | null> = {
                        period,
                      };
                      for (const m of metrics) {
                        const entry = filteredTs[m].find(
                          (p) => periodLabel(p.fiscal_year, p.fiscal_quarter) === period
                        );
                        point[m] = entry?.value ?? null;
                      }
                      return point;
                    });

                    const config: ChartConfig = {};
                    metrics.forEach((m, i) => {
                      config[m] = {
                        label: METRIC_DEFINITIONS[m]?.label ?? m.replace(/_/g, " "),
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      };
                    });

                    const unitLabel = UNIT_LABELS[unit] ?? "";
                    const tickFn = (v: number) => formatChartTick(v, unit);
                    const tooltipFn = (v: number, name: string) =>
                      formatMetricValue(name, v);

                    // Choose chart height based on whether we're in a grid
                    const chartHeight = isSingleGroup ? 350 : 280;

                    // For single-group with all metrics, decide chart type from tab config
                    // For multi-group sub-charts, always use the tab's chart type
                    const ChartComponent =
                      tab.chartType === "line"
                        ? LineChartComponent
                        : tab.chartType === "bar"
                          ? BarChartComponent
                          : AreaChartComponent;

                    return (
                      <div key={unit}>
                        {!isSingleGroup && (
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {metrics.map((m) => METRIC_DEFINITIONS[m]?.label ?? m).join(", ")}
                            {unitLabel ? ` (${unitLabel})` : ""}
                          </p>
                        )}
                        <ChartComponent
                          data={chartData}
                          xKey="period"
                          dataKeys={metrics}
                          config={config}
                          height={chartHeight}
                          yAxisTickFormatter={tickFn}
                          tooltipFormatter={tooltipFn}
                        />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
