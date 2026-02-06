import { SECTORS } from "@/lib/data/sectors";
import { SectorOpportunityCard } from "@/components/dashboard/sector-opportunity-card";
import { type SectorOverview } from "@/lib/queries/sectors";

interface SectorOverviewGridProps {
  sectorOverviews: SectorOverview[];
  sectorSparklineTrends: Record<string, Record<string, number[]>>;
}

export function SectorOverviewGrid({
  sectorOverviews,
  sectorSparklineTrends,
}: SectorOverviewGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {SECTORS.map((sector) => {
        const overview = sectorOverviews.find(
          (s) => s.sector === sector.name
        );
        const [om1, om2] = sector.opportunity_metrics;
        const sparkline =
          sectorSparklineTrends[sector.name]?.[om1.metric] ?? [];
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
            }}
            metric2={{
              name: om2.metric,
              label: om2.label,
              value: overview?.averages[om2.metric] ?? null,
            }}
            sparklineTrend={sparkline}
            color={sector.color.replace("bg-", "var(--chart-1)")}
          />
        );
      })}
    </div>
  );
}
