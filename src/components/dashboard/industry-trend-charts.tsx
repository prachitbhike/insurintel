"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartComponent } from "@/components/charts/line-chart";
import { type ChartConfig } from "@/components/ui/chart";
import { type YearlyAggregate } from "@/lib/metrics/aggregations";

const efficiencyConfig: ChartConfig = {
  combined_ratio: {
    label: "Combined Ratio",
    color: "hsl(var(--chart-1))",
  },
  expense_ratio: {
    label: "Expense Ratio",
    color: "hsl(var(--chart-2))",
  },
};

const growthConfig: ChartConfig = {
  premium_growth_yoy: {
    label: "Premium Growth YoY",
    color: "hsl(var(--chart-3))",
  },
  roe: {
    label: "Return on Equity",
    color: "hsl(var(--chart-4))",
  },
};

interface IndustryTrendChartsProps {
  efficiencyData: YearlyAggregate[];
  growthData: YearlyAggregate[];
}

export function IndustryTrendCharts({
  efficiencyData,
  growthData,
}: IndustryTrendChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Underwriting Efficiency
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Combined Ratio & Expense Ratio — industry averages over time
          </p>
        </CardHeader>
        <CardContent>
          <LineChartComponent
            data={efficiencyData}
            xKey="year"
            dataKeys={["combined_ratio", "expense_ratio"]}
            config={efficiencyConfig}
            height={260}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Growth & Returns
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Premium Growth YoY & ROE — industry averages over time
          </p>
        </CardHeader>
        <CardContent>
          <LineChartComponent
            data={growthData}
            xKey="year"
            dataKeys={["premium_growth_yoy", "roe"]}
            config={growthConfig}
            height={260}
          />
        </CardContent>
      </Card>
    </div>
  );
}
