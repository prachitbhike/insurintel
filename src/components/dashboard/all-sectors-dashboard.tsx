import { HeroBenchmarksV2, type HeroMetric } from "./hero-benchmarks-v2";
import { TopProspectsSection, type TopProspect } from "./top-prospects-section";
import { SectorOpportunityCard } from "./sector-opportunity-card";
import {
  DisruptionTargetsTable,
  type DisruptionTarget,
} from "./disruption-targets-table";
import { SECTORS } from "@/lib/data/sectors";

interface AllSectorsDashboardProps {
  heroMetrics: HeroMetric[];
  topProspects: TopProspect[];
  sectorOverviews: {
    sector: string;
    companyCount: number;
    averages: Record<string, number | null>;
  }[];
  sectorSparklineTrends: Record<string, Record<string, number[]>>;
  sectorMetricDeltas: Record<string, Record<string, number | null>>;
  sectorInterpretations: Record<string, Record<string, string | null>>;
  disruptionTargets: DisruptionTarget[];
}

export function AllSectorsDashboard({
  heroMetrics,
  topProspects,
  sectorOverviews,
  sectorSparklineTrends,
  sectorMetricDeltas,
  sectorInterpretations,
  disruptionTargets,
}: AllSectorsDashboardProps) {
  return (
    <div className="min-h-screen">
      {/* Section A: Header */}
      <section className="relative border-b border-border/50 bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="container px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-3">
              Market Intelligence
            </p>
            <h1 className="text-3xl font-display tracking-tight md:text-4xl">
              Insurance Market Pulse
            </h1>
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              Financial benchmarks, efficiency gaps, and trend analysis across 41 public insurance companies.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container px-4 md:px-6">
        {/* Section 1: Top Prospects */}
        <section className="py-14 border-b border-border/40 animate-fade-up delay-1">
          <TopProspectsSection prospects={topProspects} />
        </section>

        {/* Section 2: Market Snapshot */}
        <section className="py-10 border-b border-border/40 animate-fade-up delay-2">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-lg font-display tracking-tight">Market Snapshot</h2>
            <span className="text-xs text-muted-foreground">Industry-wide benchmarks</span>
          </div>
          <HeroBenchmarksV2 heroMetrics={heroMetrics} />
        </section>

        {/* Section 3: Sector Landscape */}
        <section className="py-14 border-b border-border/40 animate-fade-up delay-3">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="text-2xl font-display tracking-tight">Sector Landscape</h2>
            <span className="text-xs text-muted-foreground">Key metrics by sector</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SECTORS.map((sector) => {
              const overview = sectorOverviews.find(
                (s) => s.sector === sector.name
              );
              const [om1, om2] = sector.opportunity_metrics;
              const sparklineMetric = om1.metric;
              const sparkline =
                sectorSparklineTrends[sector.name]?.[sparklineMetric] ?? [];
              const deltas = sectorMetricDeltas[sector.name] ?? {};
              const interps = sectorInterpretations[sector.name] ?? {};
              return (
                <SectorOpportunityCard
                  key={sector.slug}
                  sector={sector.name}
                  label={sector.label}
                  companyCount={overview?.companyCount ?? 0}
                  metric1={{
                    name: om1.metric,
                    label: om1.label,
                    value: overview?.averages[om1.metric] ?? null,
                    delta: deltas[om1.metric] ?? null,
                    interpretation: interps[om1.metric] ?? null,
                  }}
                  metric2={{
                    name: om2.metric,
                    label: om2.label,
                    value: overview?.averages[om2.metric] ?? null,
                    delta: deltas[om2.metric] ?? null,
                    interpretation: interps[om2.metric] ?? null,
                  }}
                  sparklineTrend={sparkline}
                  color={sector.color.replace("bg-", "var(--chart-1)")}
                />
              );
            })}
          </div>
        </section>

        {/* Section 4: Company Rankings */}
        <section className="py-14 animate-fade-up delay-4">
          <DisruptionTargetsTable targets={disruptionTargets} sector="P&C" />
        </section>
      </div>
    </div>
  );
}
