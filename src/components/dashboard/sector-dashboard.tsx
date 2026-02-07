import { type SectorInfo } from "@/lib/data/sectors";
import { type Sector } from "@/types/database";
import { HeroBenchmarksV2, type HeroMetric } from "./hero-benchmarks-v2";
import { SectorMarketPulseDashboard } from "./sector-market-pulse/sector-market-pulse-dashboard";
import { type SectorDashboardData } from "@/lib/queries/sector-dashboard";
import { cn } from "@/lib/utils";

const SECTOR_TAGLINES: Record<Sector, string> = {
  "P&C": "Who's bleeding money on operations — and where AI can cut costs.",
  Health: "The admin margin squeeze. ACA mandates 80-85% MLR — who's tightest?",
  Life: "Capital-intensive, long-duration liabilities. ROE separates leaders from laggards.",
  Reinsurance: "Underwriting discipline through the catastrophe cycle.",
  Brokers: "Fee engines built on M&A debt. Leverage vs. profitability.",
  Title: "Transaction-driven revenue tied to housing market cycles. Efficiency is key.",
  "Mortgage Insurance": "Credit risk underwriting in housing. Low loss ratios = disciplined selection.",
};

const SECTOR_ACCENT: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Health: "border-t-violet-500",
  Life: "border-t-emerald-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
  Title: "border-t-teal-500",
  "Mortgage Insurance": "border-t-indigo-500",
};

interface SectorDashboardProps {
  sector: SectorInfo;
  heroMetrics: HeroMetric[];
  sectorDashboardData: SectorDashboardData;
}

export function SectorDashboard({
  sector,
  heroMetrics,
  sectorDashboardData,
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
        <div className="container px-4 pt-5 pb-4 md:px-6 md:pt-6 md:pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary/60 mb-2">
                {sector.label} Sector
              </p>
              <h1 className="text-2xl font-display tracking-tight md:text-3xl">
                <span className="font-mono text-primary/40 mr-1">&gt;</span>
                {`${sector.label} Market Pulse`}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {SECTOR_TAGLINES[sector.name]}
              </p>
            </div>
            <div className="lg:max-w-xl lg:min-w-[480px]">
              <HeroBenchmarksV2 heroMetrics={heroMetrics} />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container px-4 md:px-6">
        <section className="py-5 animate-fade-up delay-1">
          <SectorMarketPulseDashboard
            sectorName={sector.name}
            sectorLabel={sector.label}
            dashboardData={sectorDashboardData}
          />
        </section>
      </div>
    </div>
  );
}
