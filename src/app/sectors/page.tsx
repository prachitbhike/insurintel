import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSectorOverviews } from "@/lib/queries/sectors";
import { SectorOverviewGrid } from "@/components/sectors/sector-overview-grid";

export const metadata: Metadata = {
  title: "Sectors",
  description:
    "Compare insurance sectors: P&C, Life, Health, Reinsurance, and Brokers with key performance metrics.",
};

export const revalidate = 3600;

export default async function SectorsPage() {
  let overviews: Awaited<ReturnType<typeof getSectorOverviews>> = [];

  try {
    const supabase = await createClient();
    overviews = await getSectorOverviews(supabase);
  } catch {
    // Gracefully handle
  }

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sectors</h1>
        <p className="mt-1 text-muted-foreground">
          Compare performance across 5 insurance sectors.
        </p>
      </div>
      <SectorOverviewGrid overviews={overviews} />
    </div>
  );
}
