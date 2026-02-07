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
import { formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";

interface OpportunityPanelProps {
  painMetricName: string | null;
  painMetricLabel: string;
  painMetricValue: number | null;
  sectorAvgPainMetric: number | null;
  sectorBestPainMetric: number | null;
  automationSavings: number | null;
}

export function OpportunityPanel({
  painMetricName,
  painMetricLabel,
  painMetricValue,
  sectorAvgPainMetric,
  sectorBestPainMetric,
  automationSavings,
}: OpportunityPanelProps) {
  const hasGapData =
    painMetricValue != null &&
    sectorAvgPainMetric != null &&
    sectorBestPainMetric != null;

  if (!hasGapData) return null;

  const gapChartData = [
    { name: "Company", value: painMetricValue },
    { name: "Sector Avg", value: sectorAvgPainMetric },
    { name: "Best in Class", value: sectorBestPainMetric },
  ];

  const config: ChartConfig = {
    value: {
      label: painMetricLabel,
      color: "var(--chart-1)",
    },
  };

  const barColors = [
    "var(--chart-1)",
    "var(--muted-foreground)",
    "var(--positive)",
  ];

  return (
    <Card className="rounded-sm terminal-surface">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          Efficiency vs. Peers
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Compares this carrier&apos;s key pain metric against sector
                average and best-in-class.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{painMetricLabel}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ChartContainer
          config={config}
          className="w-full"
          style={{ height: 140 }}
        >
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
          <p className="text-xs text-muted-foreground mt-2">
            Gap to best-in-class:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(automationSavings)}
            </span>{" "}
            in potential efficiency gains.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
