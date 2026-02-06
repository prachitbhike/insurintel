import { type SectorInfo } from "@/lib/data/sectors";
import { type Sector } from "@/types/database";
import { HeroBenchmarksV2, type HeroMetric } from "./hero-benchmarks-v2";
import { TopProspectsSection, type TopProspect } from "./top-prospects-section";
import {
  DisruptionTargetsTable,
  type DisruptionTarget,
} from "./disruption-targets-table";
import { SectorHeroChart, type HeroChartData } from "./sector-hero-chart";
import { SectorStoryChart } from "./sector-story-chart";
import { cn } from "@/lib/utils";

const SECTOR_TAGLINES: Record<Sector, string> = {
  "P&C": "Who's bleeding money on operations — and where AI can cut costs.",
  Health: "The admin margin squeeze. ACA mandates 80-85% MLR — who's tightest?",
  Life: "Capital-intensive, long-duration liabilities. ROE separates leaders from laggards.",
  Reinsurance: "Underwriting discipline through the catastrophe cycle.",
  Brokers: "Fee engines built on M&A debt. Leverage vs. profitability.",
};

const SECTOR_ACCENT: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Health: "border-t-violet-500",
  Life: "border-t-emerald-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
};

interface SectorDashboardProps {
  sector: SectorInfo;
  heroMetrics: HeroMetric[];
  topProspects: TopProspect[];
  disruptionTargets: DisruptionTarget[];
  storyChartData: { ticker: string; value: number }[];
  storyChartAvg: number | null;
  heroChartData: HeroChartData;
}

export function SectorDashboard({
  sector,
  heroMetrics,
  topProspects,
  disruptionTargets,
  storyChartData,
  storyChartAvg,
  heroChartData,
}: SectorDashboardProps) {
  return (
    <div className="min-h-screen">
      {/* Sector Hero Banner + KPI Strip */}
      <section
        className={cn(
          "relative border-b border-border/50 bg-secondary/30 border-t-2",
          SECTOR_ACCENT[sector.name]
        )}
      >
        <div className="container px-4 pt-8 pb-6 md:px-6 md:pt-10 md:pb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/60 mb-2">
                {sector.label} Sector
              </p>
              <h1 className="text-2xl font-display tracking-tight md:text-3xl">
                <span className="font-mono text-primary/40 mr-1">&gt;</span>
                {sector.name === "P&C"
                  ? "P&C Market Pulse"
                  : sector.name === "Reinsurance"
                  ? "Reinsurance Market Pulse"
                  : `${sector.label} Market Pulse`}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {SECTOR_TAGLINES[sector.name]}
              </p>
            </div>
            <div className="lg:max-w-lg lg:min-w-[420px]">
              <HeroBenchmarksV2 heroMetrics={heroMetrics} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container px-4 md:px-6">
        {/* Section 1: Hero Chart + Prospects Sidebar */}
        <section className="py-8 border-b border-border/40 animate-fade-up delay-1">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left: Hero Chart */}
            <div>
              <SectorHeroChart chartData={heroChartData} />
            </div>
            {/* Right: Prospects + Story Chart */}
            <div className="flex flex-col gap-4">
              <TopProspectsSection prospects={topProspects} compact />
              <SectorStoryChart
                sectorName={sector.name}
                data={storyChartData}
                sectorAvg={storyChartAvg}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Company Rankings */}
        <section className="py-10 animate-fade-up delay-2">
          <DisruptionTargetsTable targets={disruptionTargets} sector={sector.name} />
        </section>
      </div>
    </div>
  );
}
