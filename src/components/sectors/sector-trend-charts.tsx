"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue, formatChartTick } from "@/lib/metrics/formatters";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { exportChartAsPNG } from "@/lib/export/chart-png";
import { type Sector } from "@/types/database";

export interface SectorTrendData {
  [metricName: string]: { period: string; [ticker: string]: string | number | null }[];
}

// --- Chart view configuration types ---

interface TrendViewConfig {
  label: string;
  description: string;
  metric: string;
  chartType: "lines" | "indexed";
  referenceLines?: { value: number; label: string }[];
}

interface SnapshotViewConfig {
  label: string;
  description: string;
  metrics: string[];
  stacked?: boolean;
  sortMetric?: string;
  sortDir: "asc" | "desc";
}

const SECTOR_CHART_VIEWS: Record<Sector, {
  trend: TrendViewConfig;
  snapshot: SnapshotViewConfig;
}> = {
  "P&C": {
    trend: {
      label: "Underwriting Trend",
      description: "Combined ratio per company over time. Below 100% = underwriting profit.",
      metric: "combined_ratio",
      chartType: "lines",
      referenceLines: [{ value: 100, label: "100% Breakeven" }],
    },
    snapshot: {
      label: "Cost Structure",
      description: "Loss ratio + expense ratio stacked per company. Shows whether claims or operations drive costs.",
      metrics: ["loss_ratio", "expense_ratio"],
      stacked: true,
      sortDir: "desc",
    },
  },
  Life: {
    trend: {
      label: "Returns Trend",
      description: "Return on equity per company over time. Reveals interest rate risk management and actuarial accuracy.",
      metric: "roe",
      chartType: "lines",
    },
    snapshot: {
      label: "Income Mix",
      description: "Net income vs investment income per company. Shows diversified earnings vs investment dependency.",
      metrics: ["net_income", "investment_income"],
      sortMetric: "net_income",
      sortDir: "desc",
    },
  },
  Health: {
    trend: {
      label: "MLR Tracker",
      description: "Medical loss ratio per company over time. ACA mandates 80-85% minimum spend on claims.",
      metric: "medical_loss_ratio",
      chartType: "lines",
      referenceLines: [{ value: 85, label: "85% ACA Floor" }],
    },
    snapshot: {
      label: "Scale Comparison",
      description: "Total revenue per company. Health is a scale game — size determines negotiating power.",
      metrics: ["revenue"],
      sortMetric: "revenue",
      sortDir: "desc",
    },
  },
  Reinsurance: {
    trend: {
      label: "Cycle Tracker",
      description: "Combined ratio per company over time. Reinsurance is deeply cyclical with cat loss spikes.",
      metric: "combined_ratio",
      chartType: "lines",
      referenceLines: [{ value: 100, label: "100% Breakeven" }],
    },
    snapshot: {
      label: "Risk Profile",
      description: "Loss ratio vs expense ratio per company. Shows whether claims or costs drive underwriting results.",
      metrics: ["loss_ratio", "expense_ratio"],
      sortMetric: "loss_ratio",
      sortDir: "desc",
    },
  },
  Brokers: {
    trend: {
      label: "Growth Trajectory",
      description: "Revenue indexed to base year (=100). Shows who's growing fastest regardless of absolute size.",
      metric: "revenue",
      chartType: "indexed",
    },
    snapshot: {
      label: "Earnings Power",
      description: "EPS per company. Capital-light model makes EPS the purest shareholder value measure.",
      metrics: ["eps"],
      sortMetric: "eps",
      sortDir: "desc",
    },
  },
  Title: {
    trend: {
      label: "Returns Trend",
      description: "Return on equity per company over time. Title insurers are revenue-driven; ROE reveals operational efficiency.",
      metric: "roe",
      chartType: "lines",
    },
    snapshot: {
      label: "Revenue Scale",
      description: "Revenue per company. Title insurance is a scale business driven by real estate transaction volume.",
      metrics: ["revenue"],
      sortMetric: "revenue",
      sortDir: "desc",
    },
  },
  "Mortgage Insurance": {
    trend: {
      label: "Underwriting Trend",
      description: "Combined ratio per company over time. Below 100% = underwriting profit.",
      metric: "combined_ratio",
      chartType: "lines",
      referenceLines: [{ value: 100, label: "100% Breakeven" }],
    },
    snapshot: {
      label: "Cost Structure",
      description: "Loss ratio + expense ratio stacked per company. Shows whether claims or operations drive costs.",
      metrics: ["loss_ratio", "expense_ratio"],
      stacked: true,
      sortDir: "desc",
    },
  },
};

const CHART_COLORS = [
  "var(--chart-1)",        // blue
  "var(--chart-2)",        // rose
  "var(--chart-3)",        // green
  "var(--chart-4)",        // amber
  "var(--chart-5)",        // purple
  "hsl(187, 70%, 45%)",   // teal
  "hsl(330, 65%, 55%)",   // pink
  "hsl(45, 80%, 48%)",    // gold
  "hsl(200, 65%, 50%)",   // steel blue
  "hsl(15, 70%, 55%)",    // coral
  "hsl(160, 55%, 42%)",   // sea green
  "hsl(280, 55%, 55%)",   // violet
  "hsl(100, 50%, 42%)",   // olive
  "hsl(350, 70%, 50%)",   // crimson
  "hsl(220, 50%, 60%)",   // slate blue
];

type ActiveView = "trend" | "snapshot" | "rankings";

interface SectorTrendChartsProps {
  trendData: SectorTrendData;
  quarterlyTrendData?: SectorTrendData;
  availableMetrics: string[];
  tickers: string[];
  sector: Sector;
}

export function SectorTrendCharts({
  trendData,
  quarterlyTrendData,
  availableMetrics,
  tickers,
  sector,
}: SectorTrendChartsProps) {
  const [activeView, setActiveView] = useState<ActiveView>("trend");
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics[0] ?? "roe"
  );
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">("annual");

  const viewConfig = SECTOR_CHART_VIEWS[sector];

  const activeTrendData = periodType === "quarterly" && quarterlyTrendData
    ? quarterlyTrendData
    : trendData;

  // --- Filter metrics to those with data ---
  const metricsWithData = useMemo(
    () => availableMetrics.filter(m => activeTrendData[m]?.length > 0),
    [availableMetrics, activeTrendData]
  );

  // --- Rankings data (with fallback to first metric that has data) ---
  const rankingsMetric =
    activeTrendData[selectedMetric]?.length > 0
      ? selectedMetric
      : Object.keys(activeTrendData).find(m => activeTrendData[m]?.length > 0) ?? selectedMetric;
  const timeseriesData = activeTrendData[rankingsMetric] ?? [];
  const def = METRIC_DEFINITIONS[rankingsMetric];
  const higherIsBetter = def?.higher_is_better ?? true;

  const { barData, sectorAvg } = useMemo(() => {
    if (timeseriesData.length === 0) return { barData: [], sectorAvg: null };

    const latestRow = timeseriesData[timeseriesData.length - 1];

    const entries: { ticker: string; value: number }[] = [];
    for (const t of tickers) {
      const v = latestRow[t];
      if (v != null) {
        entries.push({ ticker: t, value: v as number });
      }
    }

    entries.sort((a, b) =>
      higherIsBetter ? b.value - a.value : a.value - b.value
    );

    const avg =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.value, 0) / entries.length
        : null;

    return { barData: entries, sectorAvg: avg };
  }, [timeseriesData, tickers, higherIsBetter]);

  // --- Trend (timeseries) data ---
  // Use configured metric, but fall back to first available metric with data
  const configuredTrendMetric = viewConfig.trend.metric;
  const trendMetric = (activeTrendData[configuredTrendMetric] && activeTrendData[configuredTrendMetric].length > 0)
    ? configuredTrendMetric
    : Object.keys(activeTrendData).find((m) => activeTrendData[m] && activeTrendData[m].length > 0) ?? configuredTrendMetric;
  const trendTimeseriesData = activeTrendData[trendMetric] ?? [];
  const trendDef = METRIC_DEFINITIONS[trendMetric];

  const trendLinesData = useMemo(() => {
    if (trendTimeseriesData.length === 0) return { data: [], activeTickers: [] as string[] };

    // Find tickers that have at least one non-null value
    const activeTickers = tickers.filter((t) =>
      trendTimeseriesData.some((row) => row[t] != null)
    );

    // Add sector average to each row
    const data = trendTimeseriesData.map((row) => {
      const values = activeTickers
        .map((t) => row[t] as number | null)
        .filter((v): v is number => v != null);
      const avg = values.length > 0
        ? values.reduce((s, v) => s + v, 0) / values.length
        : null;
      return { ...row, __sectorAvg: avg };
    });

    // Compute Y-axis domain from actual data range
    const allValues: number[] = [];
    for (const row of data) {
      for (const t of activeTickers) {
        const v = (row as Record<string, unknown>)[t];
        if (typeof v === "number") allValues.push(v);
      }
      if (typeof row.__sectorAvg === "number") allValues.push(row.__sectorAvg);
    }

    let yDomain: [number, number] | undefined;
    if (allValues.length > 0) {
      const dataMin = Math.min(...allValues);
      const dataMax = Math.max(...allValues);
      const range = dataMax - dataMin;
      // Only narrow the domain if the range is small relative to the values
      // (e.g., data clustered at 70-100% shouldn't show 0-100% axis)
      if (range > 0 && dataMin > 0 && dataMin > range * 2) {
        const padding = Math.max(range * 0.2, 1);
        yDomain = [
          Math.floor((dataMin - padding) / 5) * 5,
          Math.ceil((dataMax + padding) / 5) * 5,
        ];
      }
    }

    return { data, activeTickers, yDomain };
  }, [trendTimeseriesData, tickers]);

  // --- Indexed data (for Brokers "indexed" chart type) ---
  const indexedData = useMemo(() => {
    if (viewConfig.trend.chartType !== "indexed") return null;
    const ts = activeTrendData[trendMetric] ?? [];
    const activeTickers = tickers.filter((t) =>
      ts.some((row) => row[t] != null)
    );

    // Find base value (earliest non-null) per ticker
    const baseValues = new Map<string, number>();
    for (const t of activeTickers) {
      for (const row of ts) {
        const v = row[t] as number | null;
        if (v != null && v !== 0) {
          baseValues.set(t, v);
          break;
        }
      }
    }

    const data = ts.map((row) => {
      const entry: Record<string, string | number | null> = { period: row.period };
      for (const t of activeTickers) {
        const v = row[t] as number | null;
        const base = baseValues.get(t);
        entry[t] = v != null && base ? (v / base) * 100 : null;
      }
      return entry;
    });

    return { data, activeTickers };
  }, [activeTrendData, trendMetric, tickers, viewConfig.trend.chartType]);

  // --- Snapshot data ---
  const snapshotData = useMemo(() => {
    const config = viewConfig.snapshot;
    const entries = tickers.map((ticker) => {
      const entry: Record<string, string | number | null> = { ticker };
      for (const metric of config.metrics) {
        const ts = activeTrendData[metric];
        if (ts && ts.length > 0) {
          entry[metric] = ts[ts.length - 1][ticker] ?? null;
        } else {
          entry[metric] = null;
        }
      }
      return entry;
    }).filter((d) => config.metrics.some((m) => d[m] != null));

    // Sort
    if (config.stacked) {
      // Sort by sum of all metrics
      entries.sort((a, b) => {
        const sumA = config.metrics.reduce((s, m) => s + ((a[m] as number) ?? 0), 0);
        const sumB = config.metrics.reduce((s, m) => s + ((b[m] as number) ?? 0), 0);
        return config.sortDir === "desc" ? sumB - sumA : sumA - sumB;
      });
    } else if (config.sortMetric) {
      entries.sort((a, b) => {
        const va = (a[config.sortMetric!] as number) ?? 0;
        const vb = (b[config.sortMetric!] as number) ?? 0;
        return config.sortDir === "desc" ? vb - va : va - vb;
      });
    }

    // Compute average per metric
    const averages: Record<string, number | null> = {};
    for (const metric of config.metrics) {
      const values = entries
        .map((e) => e[metric] as number | null)
        .filter((v): v is number => v != null);
      averages[metric] = values.length > 0
        ? values.reduce((s, v) => s + v, 0) / values.length
        : null;
    }

    return { entries, averages };
  }, [activeTrendData, tickers, viewConfig.snapshot]);

  // --- Excluded tickers per view ---
  const trendExcluded = useMemo(() => {
    const shown = indexedData?.activeTickers ?? trendLinesData.activeTickers;
    return tickers.filter((t) => !shown.includes(t));
  }, [tickers, trendLinesData.activeTickers, indexedData]);

  const snapshotExcluded = useMemo(() => {
    const shownSet = new Set(snapshotData.entries.map((e) => e.ticker as string));
    return tickers.filter((t) => !shownSet.has(t));
  }, [tickers, snapshotData.entries]);

  const rankingsExcluded = useMemo(() => {
    const shownSet = new Set(barData.map((e) => e.ticker));
    return tickers.filter((t) => !shownSet.has(t));
  }, [tickers, barData]);

  // --- Chart configs ---
  const rankingsConfig: ChartConfig = {
    value: {
      label: def?.label ?? rankingsMetric.replace(/_/g, " "),
      color: "var(--chart-1)",
    },
  };

  const trendChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    const chartTickers = indexedData?.activeTickers ?? trendLinesData.activeTickers;
    for (let i = 0; i < chartTickers.length; i++) {
      const t = chartTickers[i];
      cfg[t] = {
        label: t,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    }
    if (!indexedData) {
      cfg.__sectorAvg = {
        label: "Sector Avg",
        color: "var(--muted-foreground)",
      };
    }
    return cfg;
  }, [trendLinesData.activeTickers, indexedData]);

  const snapshotChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    const metrics = viewConfig.snapshot.metrics;
    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i];
      const mDef = METRIC_DEFINITIONS[m];
      cfg[m] = {
        label: mDef?.label ?? m.replace(/_/g, " "),
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    }
    return cfg;
  }, [viewConfig.snapshot.metrics]);

  const rankingsChartHeight = Math.max(280, barData.length * 36 + 40);
  const snapshotChartHeight = Math.max(280, snapshotData.entries.length * 36 + 40);

  // View labels for tabs
  const isFallbackMetric = trendMetric !== configuredTrendMetric;
  const trendLabel = isFallbackMetric
    ? `${trendDef?.label ?? trendMetric.replace(/_/g, " ")} Trend`
    : viewConfig.trend.label;
  const viewLabels: Record<ActiveView, string> = {
    trend: trendLabel,
    snapshot: viewConfig.snapshot.label,
    rankings: "Rankings",
  };

  // Description for current view
  const trendDescription = isFallbackMetric
    ? `${trendDef?.label ?? trendMetric} per company over time.`
    : viewConfig.trend.description;
  const currentDescription = activeView === "trend"
    ? trendDescription
    : activeView === "snapshot"
      ? viewConfig.snapshot.description
      : timeseriesData.length > 0
        ? `Latest ${periodType === "quarterly" ? "quarter" : "year"} \u00b7 ${barData.length} companies \u00b7 sorted ${higherIsBetter ? "highest" : "lowest"} first`
        : undefined;

  const exportFilename = activeView === "trend"
    ? `${sector.toLowerCase().replace(/&/g, "")}-${viewConfig.trend.label.toLowerCase().replace(/\s+/g, "-")}.png`
    : activeView === "snapshot"
      ? `${sector.toLowerCase().replace(/&/g, "")}-${viewConfig.snapshot.label.toLowerCase().replace(/\s+/g, "-")}.png`
      : "company-rankings.png";

  return (
    <Card className="group">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Sector Analysis</CardTitle>
            <ExportButtonGroup onPNG={async () => {
              const el = document.querySelector("[data-chart-export='sector-trends']");
              if (el instanceof HTMLElement) return exportChartAsPNG(el, exportFilename);
              return false;
            }} />
          </div>
          <div className="flex items-center gap-2">
            {activeView !== "snapshot" && (
              <PeriodSelector value={periodType} onValueChange={setPeriodType} />
            )}
            {activeView === "rankings" && (
              <Select value={rankingsMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricsWithData.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METRIC_DEFINITIONS[m]?.label ?? m.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as ActiveView)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="trend" className="text-xs px-3">
              {viewLabels.trend}
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="text-xs px-3">
              {viewLabels.snapshot}
            </TabsTrigger>
            <TabsTrigger value="rankings" className="text-xs px-3">
              Rankings
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {currentDescription && (
          <p className="text-xs text-muted-foreground">
            {currentDescription}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Trend (Timeseries Line Chart) */}
        {activeView === "trend" && viewConfig.trend.chartType === "indexed" && indexedData ? (
          indexedData.data.length > 0 ? (
            <>
              <ChartContainer
                config={trendChartConfig}
                className="w-full"
                style={{ height: 380 }}
                data-chart-export="sector-trends"
              >
                <LineChart
                  data={indexedData.data}
                  margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    interval={0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    width={56}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          const v = value as number;
                          const delta = v - 100;
                          const sign = delta >= 0 ? "+" : "";
                          return `${v.toFixed(1)} (${sign}${delta.toFixed(1)}% from base)`;
                        }}
                      />
                    }
                  />
                  <ReferenceLine
                    y={100}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: "Base Year",
                      position: "right",
                      className: "text-[10px] fill-muted-foreground",
                    }}
                  />
                  {indexedData.activeTickers.map((ticker, i) => (
                    <Line
                      key={ticker}
                      type="monotone"
                      dataKey={ticker}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      connectNulls
                      name={ticker}
                    />
                  ))}
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="line"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </LineChart>
              </ChartContainer>
              {trendExcluded.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Not shown ({trendExcluded.length}): {trendExcluded.join(", ")} — metric not available
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No trend data available for {trendDef?.label ?? trendMetric}.
            </p>
          )
        ) : activeView === "trend" && (
          trendLinesData.data.length > 0 ? (() => {
            const companyCount = trendLinesData.activeTickers.length;
            const lineOpacity = companyCount > 10 ? 0.35 : companyCount > 6 ? 0.5 : 0.8;
            const lineWidth = companyCount > 10 ? 1 : companyCount > 6 ? 1.25 : 1.5;
            return (
              <>
                <ChartContainer
                  config={trendChartConfig}
                  className="w-full"
                  style={{ height: 380 }}
                  data-chart-export="sector-trends"
                >
                  <LineChart
                    data={trendLinesData.data}
                    margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      className="text-xs fill-muted-foreground"
                      interval={0}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      className="text-xs fill-muted-foreground"
                      width={56}
                      domain={trendLinesData.yDomain ?? ["auto", "auto"]}
                      tickFormatter={(v: number) =>
                        formatChartTick(v, trendDef?.unit ?? "number")
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatMetricValue(trendMetric, value as number)
                          }
                        />
                      }
                    />
                    {!isFallbackMetric && viewConfig.trend.referenceLines?.map((ref) => (
                      <ReferenceLine
                        key={ref.value}
                        y={ref.value}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                        label={{
                          value: ref.label,
                          position: "right",
                          className: "text-[10px] fill-muted-foreground",
                        }}
                      />
                    ))}
                    {/* Sector average line */}
                    <Line
                      type="monotone"
                      dataKey="__sectorAvg"
                      stroke="var(--muted-foreground)"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls
                      name="Sector Avg"
                    />
                    {/* Company lines — all visible with adaptive styling */}
                    {trendLinesData.activeTickers.map((ticker, i) => (
                      <Line
                        key={ticker}
                        type="monotone"
                        dataKey={ticker}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={lineWidth}
                        strokeOpacity={lineOpacity}
                        dot={companyCount <= 8 ? { r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] } : false}
                        connectNulls
                        name={ticker}
                      />
                    ))}
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="line"
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </LineChart>
                </ChartContainer>
                {trendExcluded.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    Not shown ({trendExcluded.length}): {trendExcluded.join(", ")} — metric not available
                  </p>
                )}
              </>
            );
          })() : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No trend data available for {trendDef?.label ?? trendMetric}.
            </p>
          )
        )}

        {/* Snapshot (Bar Chart) */}
        {activeView === "snapshot" && (
          snapshotData.entries.length > 0 ? (
            <>
              <ChartContainer
                config={snapshotChartConfig}
                className="w-full"
                style={{ height: snapshotChartHeight }}
                data-chart-export="sector-trends"
              >
                <BarChart
                  data={snapshotData.entries}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v: number) => {
                      const firstMetric = viewConfig.snapshot.metrics[0];
                      const mDef = METRIC_DEFINITIONS[firstMetric];
                      return formatChartTick(v, mDef?.unit ?? "number");
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="ticker"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground font-mono"
                    width={52}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) =>
                          formatMetricValue(name as string, value as number)
                        }
                      />
                    }
                  />
                  {/* Reference lines for sector averages */}
                  {viewConfig.snapshot.metrics.length === 1 && snapshotData.averages[viewConfig.snapshot.metrics[0]] != null && (
                    <ReferenceLine
                      x={snapshotData.averages[viewConfig.snapshot.metrics[0]]!}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Avg ${formatMetricValue(viewConfig.snapshot.metrics[0], snapshotData.averages[viewConfig.snapshot.metrics[0]])}`,
                        position: "top",
                        className: "text-[10px] fill-muted-foreground",
                      }}
                    />
                  )}
                  {viewConfig.snapshot.metrics.map((metric, i) => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      stackId={viewConfig.snapshot.stacked ? "stack" : undefined}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={
                        viewConfig.snapshot.stacked
                          ? i === viewConfig.snapshot.metrics.length - 1
                            ? [0, 6, 6, 0]
                            : [0, 0, 0, 0]
                          : [0, 6, 6, 0]
                      }
                      maxBarSize={28}
                      name={METRIC_DEFINITIONS[metric]?.label ?? metric}
                    />
                  ))}
                  {viewConfig.snapshot.metrics.length > 1 && (
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  )}
                </BarChart>
              </ChartContainer>
              {snapshotExcluded.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Not shown ({snapshotExcluded.length}): {snapshotExcluded.join(", ")} — metric not available
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No snapshot data available.
            </p>
          )
        )}

        {/* Rankings (existing chart, unchanged) */}
        {activeView === "rankings" && (
          barData.length > 0 ? (
            <>
              <ChartContainer
                config={rankingsConfig}
                className="w-full"
                style={{ height: rankingsChartHeight }}
                data-chart-export="sector-trends"
              >
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v: number) =>
                      formatChartTick(v, def?.unit ?? "number")
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="ticker"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs fill-muted-foreground font-mono"
                    width={52}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatMetricValue(rankingsMetric, value as number)
                        }
                      />
                    }
                  />
                  {sectorAvg != null && (
                    <ReferenceLine
                      x={sectorAvg}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Avg ${formatMetricValue(rankingsMetric, sectorAvg)}`,
                        position: "top",
                        className: "text-[10px] fill-muted-foreground",
                      }}
                    />
                  )}
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {barData.map((entry, i) => {
                      const isBest = i === 0;
                      const isWorst = i === barData.length - 1 && barData.length > 1;
                      return (
                        <Cell
                          key={entry.ticker}
                          fill={
                            isBest
                              ? "var(--positive)"
                              : isWorst
                                ? "var(--negative)"
                                : "var(--chart-1)"
                          }
                          fillOpacity={isBest || isWorst ? 0.85 : 0.6}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {rankingsExcluded.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Not shown ({rankingsExcluded.length}): {rankingsExcluded.join(", ")} — metric not available
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No trend data available.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
