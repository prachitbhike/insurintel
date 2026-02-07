"use client";

import { type PCBreakevenItem, PCBreakevenChart } from "./charts/pc-breakeven-chart";
import { type HealthMarginItem, HealthMarginChart } from "./charts/health-margin-chart";
import { type LifeBubbleItem, LifeBubbleChart } from "./charts/life-bubble-chart";
import { type ReinsuranceRadarItem, ReinsuranceRadarChart } from "./charts/reinsurance-radar-chart";
import { type BrokerLeverageItem, BrokerLeverageChart } from "./charts/broker-leverage-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type HeroChartData =
  | { type: "pc-breakeven"; data: PCBreakevenItem[]; sectorAvg: number | null }
  | { type: "health-margin"; data: HealthMarginItem[] }
  | { type: "life-bubble"; data: LifeBubbleItem[]; avgAssets: number; avgRoe: number }
  | { type: "reinsurance-radar"; data: ReinsuranceRadarItem[] }
  | { type: "broker-leverage"; data: BrokerLeverageItem[]; avgDE: number | null; avgROE: number | null };

const CHART_META: Record<
  HeroChartData["type"],
  { title: string; description: string }
> = {
  "pc-breakeven": {
    title: "Underwriting Breakeven",
    description:
      "Combined ratio by company. The 100% line divides profit from loss.",
  },
  "health-margin": {
    title: "Admin Margin Squeeze",
    description:
      "ACA mandates 80-85% MLR. The violet sliver is all that's left for operations + profit.",
  },
  "life-bubble": {
    title: "Capital Efficiency Map",
    description:
      "Assets vs ROE. Bubble size = net income. Color = efficiency score.",
  },
  "reinsurance-radar": {
    title: "Discipline Radar",
    description:
      "Normalized across 5 dimensions. Outer = better. Who's most disciplined?",
  },
  "broker-leverage": {
    title: "Leverage vs Returns",
    description:
      "M&A debt (bars) vs ROE (dots). Is the leverage paying off?",
  },
};

interface SectorHeroChartProps {
  chartData: HeroChartData;
}

export function SectorHeroChart({ chartData }: SectorHeroChartProps) {
  const meta = CHART_META[chartData.type];

  return (
    <Card className="rounded-sm">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-base font-display tracking-tight">
          {meta.title}
        </CardTitle>
        <CardDescription className="text-xs">
          {meta.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {chartData.type === "pc-breakeven" && (
          <PCBreakevenChart
            data={chartData.data}
            sectorAvg={chartData.sectorAvg}
          />
        )}
        {chartData.type === "health-margin" && (
          <HealthMarginChart data={chartData.data} />
        )}
        {chartData.type === "life-bubble" && (
          <LifeBubbleChart
            data={chartData.data}
            avgAssets={chartData.avgAssets}
            avgRoe={chartData.avgRoe}
          />
        )}
        {chartData.type === "reinsurance-radar" && (
          <ReinsuranceRadarChart data={chartData.data} />
        )}
        {chartData.type === "broker-leverage" && (
          <BrokerLeverageChart
            data={chartData.data}
            avgDE={chartData.avgDE}
            avgROE={chartData.avgROE}
          />
        )}
      </CardContent>
    </Card>
  );
}
