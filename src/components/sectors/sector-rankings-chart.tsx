"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { type CompanyRanking } from "@/types/database";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { type ChartConfig } from "@/components/ui/chart";

interface SectorRankingsChartProps {
  rankings: Record<string, CompanyRanking[]>;
  availableMetrics: string[];
}

export function SectorRankingsChart({
  rankings,
  availableMetrics,
}: SectorRankingsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics[0] ?? "roe"
  );

  const currentRankings = rankings[selectedMetric] ?? [];
  const chartData = currentRankings.map((r) => ({
    ticker: r.ticker,
    value: r.metric_value,
  }));

  const config: ChartConfig = {
    value: {
      label:
        METRIC_DEFINITIONS[selectedMetric]?.label ??
        selectedMetric.replace(/_/g, " "),
      color: "hsl(220, 70%, 50%)",
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company Rankings</CardTitle>
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map((m) => (
              <SelectItem key={m} value={m}>
                {METRIC_DEFINITIONS[m]?.label ?? m.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <BarChartComponent
            data={chartData}
            xKey="ticker"
            dataKeys={["value"]}
            config={config}
            height={Math.max(300, chartData.length * 35)}
            layout="vertical"
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No ranking data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
