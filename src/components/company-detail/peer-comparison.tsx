"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { type PeerComparison as PeerComparisonType } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { type ChartConfig } from "@/components/ui/chart";

interface PeerComparisonProps {
  comparisons: PeerComparisonType[];
  ticker: string;
}

export function PeerComparison({ comparisons, ticker }: PeerComparisonProps) {
  if (comparisons.length === 0) {
    return null;
  }

  const chartMetrics = comparisons.filter(
    (c) => c.company_value != null && c.sector_avg != null
  );

  const chartData = chartMetrics.map((c) => {
    const def = METRIC_DEFINITIONS[c.metric_name];
    return {
      metric: def?.label ?? c.metric_name.replace(/_/g, " "),
      [ticker]: c.company_value,
      "Sector Avg": c.sector_avg,
    };
  });

  const config: ChartConfig = {
    [ticker]: { label: ticker, color: "hsl(220, 70%, 50%)" },
    "Sector Avg": { label: "Sector Avg", color: "hsl(0, 0%, 60%)" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peer Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BarChartComponent
          data={chartData}
          xKey="metric"
          dataKeys={[ticker, "Sector Avg"]}
          config={config}
          height={300}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((c) => (
            <div
              key={c.metric_name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-xs text-muted-foreground capitalize">
                  {c.metric_name.replace(/_/g, " ")}
                </p>
                <p className="text-sm font-medium">
                  {formatMetricValue(c.metric_name, c.company_value)}
                </p>
              </div>
              {c.rank != null && c.total != null && (
                <Badge variant="secondary" className="text-xs">
                  #{c.rank}/{c.total}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
