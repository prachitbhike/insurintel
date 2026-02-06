"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { type ProspectScoreResult } from "@/lib/scoring/types";
import { formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

interface OpportunityPanelProps {
  painMetricName: string | null;
  painMetricLabel: string;
  painMetricValue: number | null;
  sectorAvgPainMetric: number | null;
  sectorBestPainMetric: number | null;
  automationSavings: number | null;
  prospectScore: ProspectScoreResult;
  sector: string;
}

const SCORE_SEGMENTS = [
  {
    key: "painIntensity" as const,
    label: "Pain",
    color: "bg-rose-500",
    weight: "40%",
  },
  {
    key: "abilityToPay" as const,
    label: "Budget",
    color: "bg-sky-500",
    weight: "20%",
  },
  {
    key: "urgency" as const,
    label: "Urgency",
    color: "bg-yellow-500",
    weight: "25%",
  },
  {
    key: "scaleFit" as const,
    label: "Scale Fit",
    color: "bg-violet-500",
    weight: "15%",
  },
];

function tierColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function tierLabel(score: number | null): string {
  if (score == null) return "N/A";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getSegmentExplanation(
  key: string,
  prospectScore: ProspectScoreResult,
): string | null {
  switch (key) {
    case "painIntensity": {
      if (prospectScore.painMetricName && prospectScore.painVsSectorAvg != null) {
        const label = prospectScore.painMetricName.replace(/_/g, " ");
        const gap = prospectScore.painVsSectorAvg;
        if (gap > 0) return `${label} ${gap.toFixed(1)}pp above sector avg`;
        return `${label} near sector avg`;
      }
      return null;
    }
    case "abilityToPay": {
      if (prospectScore.revenueBase != null) {
        return `${formatCurrency(prospectScore.revenueBase)} in premiums`;
      }
      return null;
    }
    case "urgency": {
      if (prospectScore.trendDirection) {
        return `${prospectScore.trendDirection} trend`;
      }
      return null;
    }
    case "scaleFit": {
      if (prospectScore.revenueBase != null) {
        const rev = prospectScore.revenueBase;
        if (rev >= 50e9) return "large-cap carrier";
        if (rev >= 5e9) return `revenue in the $5B–$50B range`;
        return "smaller-scale company";
      }
      return null;
    }
    default:
      return null;
  }
}

export function OpportunityPanel({
  painMetricName,
  painMetricLabel,
  painMetricValue,
  sectorAvgPainMetric,
  sectorBestPainMetric,
  automationSavings,
  prospectScore,
}: OpportunityPanelProps) {
  const hasGapData = painMetricValue != null && sectorAvgPainMetric != null && sectorBestPainMetric != null;
  const hasScore = prospectScore.totalScore != null;

  if (!hasGapData && !hasScore) return null;

  // Build efficiency gap chart data
  const gapChartData = hasGapData
    ? [
        { name: "Company", value: painMetricValue },
        { name: "Sector Avg", value: sectorAvgPainMetric },
        { name: "Best in Class", value: sectorBestPainMetric },
      ]
    : [];

  const config: ChartConfig = {
    value: {
      label: painMetricLabel,
      color: "var(--chart-1)",
    },
  };

  const barColors = ["var(--chart-1)", "var(--muted-foreground)", "var(--positive)"];

  return (
    <Card className="rounded-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          Efficiency Analysis
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Efficiency gap shows the distance between this company and best-in-class on the sector&apos;s key pain metric. Prospect score is a composite of four data-derived dimensions.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={cn(
          "grid gap-5",
          hasGapData && hasScore ? "md:grid-cols-2" : "grid-cols-1"
        )}>
          {/* Left: Efficiency Gap */}
          {hasGapData && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs font-medium">Efficiency Gap</h3>
                <span className="text-[11px] text-muted-foreground">{painMetricLabel}</span>
              </div>
              <ChartContainer config={config} className="w-full" style={{ height: 120 }}>
                <BarChart
                  data={gapChartData}
                  layout="vertical"
                  margin={{ top: 2, right: 30, left: 2, bottom: 2 }}
                >
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(v: number) =>
                      painMetricName
                        ? formatMetricValue(painMetricName, v)
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    className="text-[10px] fill-muted-foreground"
                    width={80}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          painMetricName
                            ? formatMetricValue(painMetricName, value as number)
                            : String(value)
                        }
                      />
                    }
                  />
                  <Bar dataKey="value" radius={[0, 2, 2, 0]} maxBarSize={20}>
                    {gapChartData.map((_, idx) => (
                      <Cell key={idx} fill={barColors[idx]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {automationSavings != null && automationSavings > 0 && (
                <p className="text-xs text-muted-foreground">
                  Gap to best-in-class:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(automationSavings)}
                  </span>{" "}
                  in potential efficiency gains.
                </p>
              )}
            </div>
          )}

          {/* Right: Prospect Score Breakdown */}
          {hasScore && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xs font-medium">Prospect Score</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl led-number data-glow font-bold">
                    {prospectScore.totalScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="space-y-2">
                {SCORE_SEGMENTS.map((seg) => {
                  const value = prospectScore[seg.key];
                  if (value == null) return null;
                  const explanation = getSegmentExplanation(seg.key, prospectScore);
                  return (
                    <div key={seg.key} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {seg.label}
                          {explanation && (
                            <span className="text-foreground/60"> — {explanation}</span>
                          )}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {value}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-sm overflow-hidden bg-secondary">
                        <div
                          className={cn("h-full rounded-sm transition-all duration-500", tierColor(value))}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Overall: <span className="font-medium">{tierLabel(prospectScore.totalScore)}</span> prospect score
                {prospectScore.trendDirection && (
                  <> &middot; Trend: {prospectScore.trendDirection}</>
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
