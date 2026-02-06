import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSectorOverviews } from "@/lib/queries/sectors";
import { getIndustryTimeseries } from "@/lib/queries/metrics";
import { SectorOverviewGrid } from "@/components/sectors/sector-overview-grid";
import { aggregateSectorByYear } from "@/lib/metrics/aggregations";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sectors",
  description:
    "Explore the 5 insurance sectors — P&C, Life, Health, Reinsurance, and Brokers — with key metrics and AI opportunity analysis.",
};

export default async function SectorsPage() {
  let sectorOverviews: Awaited<ReturnType<typeof getSectorOverviews>> = [];
  let sectorExpenseTrends: Record<string, number[]> = {};

  try {
    const supabase = await createClient();
    const [overviews, timeseries] = await Promise.all([
      getSectorOverviews(supabase),
      getIndustryTimeseries(supabase, ["expense_ratio"]),
    ]);
    sectorOverviews = overviews;
    sectorExpenseTrends = aggregateSectorByYear(timeseries, "expense_ratio");
  } catch {
    // Gracefully handle
  }

  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Sectors
        </p>
        <h1 className="text-3xl font-display tracking-tight">
          Insurance Sectors
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Five sectors spanning the full insurance value chain. Each sector
          presents distinct pain points, efficiency gaps, and AI automation
          opportunities.
        </p>
      </div>

      <SectorOverviewGrid
        sectorOverviews={sectorOverviews}
        sectorExpenseTrends={sectorExpenseTrends}
      />
    </div>
  );
}
