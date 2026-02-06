"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartComponent } from "@/components/charts/line-chart";
import { type ChartConfig } from "@/components/ui/chart";
import { type PeriodAggregate } from "@/lib/metrics/aggregations";
import { formatMetricValue, formatChartTick } from "@/lib/metrics/formatters";

const efficiencyConfig: ChartConfig = {
  combined_ratio: {
    label: "Combined Ratio",
    color: "var(--chart-1)",
  },
  expense_ratio: {
    label: "Expense Ratio",
    color: "var(--chart-2)",
  },
};

const growthConfig: ChartConfig = {
  premium_growth_yoy: {
    label: "Premium Growth YoY",
    color: "var(--chart-3)",
  },
  roe: {
    label: "Return on Equity",
    color: "var(--chart-4)",
  },
};

const pctTickFormatter = (v: number) => formatChartTick(v, "percent");
const pctTooltipFormatter = (v: number, name: string) =>
  formatMetricValue(name, v);

interface IndustryTrendChartsProps {
  efficiencyData: PeriodAggregate[];
  growthData: PeriodAggregate[];
}

export function IndustryTrendCharts({
  efficiencyData,
  growthData,
}: IndustryTrendChartsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            Underwriting Efficiency
          </CardTitle>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Combined Ratio & Expense Ratio (%) — quarterly industry averages
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <LineChartComponent
            data={efficiencyData}
            xKey="period"
            dataKeys={["combined_ratio", "expense_ratio"]}
            config={efficiencyConfig}
            height={240}
            yAxisTickFormatter={pctTickFormatter}
            tooltipFormatter={pctTooltipFormatter}
          />
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            Growth & Returns
          </CardTitle>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Premium Growth YoY & ROE (%) — quarterly industry averages
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <LineChartComponent
            data={growthData}
            xKey="period"
            dataKeys={["premium_growth_yoy", "roe"]}
            config={growthConfig}
            height={240}
            yAxisTickFormatter={pctTickFormatter}
            tooltipFormatter={pctTooltipFormatter}
          />
        </CardContent>
      </Card>
    </div>
  );
}
