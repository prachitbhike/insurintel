"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartComponent } from "@/components/charts/line-chart";
import { AreaChartComponent } from "@/components/charts/area-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { type TimeseriesPoint } from "@/types/company";
import { type ChartConfig } from "@/components/ui/chart";
import { type MetricInterpretation } from "@/lib/metrics/interpret";
import {
  type InvestmentMetricConfig,
  INVESTMENT_METRICS,
} from "@/lib/data/company-detail-config";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import {
  formatMetricValue,
  formatChartTick,
} from "@/lib/metrics/formatters";

interface InvestmentSectionProps {
  timeseries: Record<string, TimeseriesPoint[]>;
  sector: string;
  sectorAvgs: Record<string, number | null>;
  interpretations: Record<string, MetricInterpretation>;
}

export function InvestmentSection({
  timeseries,
  sector,
  sectorAvgs,
  interpretations,
}: InvestmentSectionProps) {
  const metricConfigs: InvestmentMetricConfig[] =
    INVESTMENT_METRICS[sector] ?? INVESTMENT_METRICS["P&C"];

  // Filter to metrics that have data
  const activeMetrics = metricConfigs.filter((mc) => {
    const ts = timeseries[mc.key];
    if (!ts) return false;
    const annual = ts.filter((p) => p.fiscal_quarter == null);
    return annual.length >= 1;
  });

  if (activeMetrics.length === 0) {
    return (
      <Card className="rounded-sm terminal-surface">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No investment profile data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Investment Profile
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {activeMetrics.map((mc) => (
          <InvestmentChart
            key={mc.key}
            config={mc}
            timeseries={timeseries[mc.key] ?? []}
            sectorAvg={sectorAvgs[mc.key] ?? null}
            interpretation={interpretations[mc.key]}
          />
        ))}
      </div>
    </div>
  );
}

function InvestmentChart({
  config,
  timeseries,
  sectorAvg,
  interpretation,
}: {
  config: InvestmentMetricConfig;
  timeseries: TimeseriesPoint[];
  sectorAvg: number | null;
  interpretation?: MetricInterpretation;
}) {
  const annualData = timeseries
    .filter((p) => p.fiscal_quarter == null)
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((p) => ({
      period: `FY${p.fiscal_year}`,
      [config.key]: p.value,
    }));

  if (annualData.length === 0) return null;

  const def = METRIC_DEFINITIONS[config.key];
  const unit = def?.unit ?? "number";

  const chartConfig: ChartConfig = {
    [config.key]: {
      label: config.label,
      color: "var(--chart-1)",
    },
  };

  const tickFn = (v: number) => formatChartTick(v, unit);
  const tooltipFn = (v: number, name: string) => formatMetricValue(name, v);

  const ChartComponent =
    config.chartType === "area"
      ? AreaChartComponent
      : config.chartType === "bar"
        ? BarChartComponent
        : LineChartComponent;

  return (
    <Card className="rounded-sm terminal-surface">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-xs font-mono uppercase tracking-wider">
          {config.label}
        </CardTitle>
        {sectorAvg != null && (
          <p className="text-[10px] text-muted-foreground">
            Sector avg: {formatMetricValue(config.key, sectorAvg)}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <ChartComponent
          data={annualData}
          xKey="period"
          dataKeys={[config.key]}
          config={chartConfig}
          height={180}
          yAxisTickFormatter={tickFn}
          tooltipFormatter={tooltipFn}
        />
        {interpretation && interpretation.plainEnglish !== interpretation.formattedValue && (
          <p className="mt-1.5 text-[11px] text-foreground/60 leading-snug">
            {interpretation.plainEnglish}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
