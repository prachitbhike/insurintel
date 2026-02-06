import { SECTORS } from "@/lib/data/sectors";
import { SectorOpportunityCard } from "@/components/dashboard/sector-opportunity-card";
import { type SectorOverview } from "@/lib/queries/sectors";

interface SectorOverviewGridProps {
  sectorOverviews: SectorOverview[];
  sectorExpenseTrends: Record<string, number[]>;
}

export function SectorOverviewGrid({
  sectorOverviews,
  sectorExpenseTrends,
}: SectorOverviewGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {SECTORS.map((sector) => {
        const overview = sectorOverviews.find(
          (s) => s.sector === sector.name
        );
        return (
          <SectorOpportunityCard
            key={sector.slug}
            sector={sector.name}
            label={sector.label}
            companyCount={overview?.companyCount ?? 0}
            avgExpenseRatio={overview?.averages["expense_ratio"] ?? null}
            premiumGrowth={
              overview?.averages["premium_growth_yoy"] ?? null
            }
            expenseRatioTrend={sectorExpenseTrends[sector.name] ?? []}
            color={sector.color.replace("bg-", "var(--chart-1)")}
          />
        );
      })}
    </div>
  );
}
