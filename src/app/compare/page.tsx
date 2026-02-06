import { type Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAllCompanies } from "@/lib/queries/companies";
import { getComparisonData } from "@/lib/queries/compare";
import { computeDynamicPresets, type ComparisonPreset } from "@/lib/queries/presets";
import { ComparePageClient } from "@/components/compare/compare-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getSectorBySlug } from "@/lib/data/sectors";

export const metadata: Metadata = {
  title: "Compare Companies",
  description:
    "Compare financial metrics across up to 5 insurance companies side by side.",
};

interface PageProps {
  searchParams: Promise<{ companies?: string; sector?: string }>;
}

async function CompareContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const companiesParam = params.companies;
  const initialTickers = companiesParam
    ? companiesParam.split(",").slice(0, 5)
    : [];

  const sectorSlug = params.sector ?? null;
  const sectorInfo = sectorSlug ? getSectorBySlug(sectorSlug) ?? null : null;

  let allCompanies: { ticker: string; name: string; sector: string }[] = [];
  let initialData = null;
  let dynamicPresets: ComparisonPreset[] = [];

  try {
    const supabase = await createClient();
    const [companies, presets] = await Promise.all([
      getAllCompanies(supabase),
      computeDynamicPresets(supabase),
    ]);
    allCompanies = companies.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
    }));
    dynamicPresets = presets;

    if (initialTickers.length > 0) {
      initialData = await getComparisonData(supabase, initialTickers);
    }
  } catch {
    // Gracefully handle
  }

  // If sector filter is active, pre-filter companies list (picker still shows all, but sorted)
  const filteredCompanies = sectorInfo
    ? [
        ...allCompanies.filter((c) => c.sector === sectorInfo.name),
        ...allCompanies.filter((c) => c.sector !== sectorInfo.name),
      ]
    : allCompanies;

  return (
    <ComparePageClient
      allCompanies={filteredCompanies}
      initialData={initialData}
      initialTickers={initialTickers}
      dynamicPresets={dynamicPresets}
    />
  );
}

export default function ComparePage(props: PageProps) {
  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-display tracking-tight md:text-4xl">
          <span className="font-mono text-primary/40 mr-1">&gt;</span>
          Compare Companies
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          Select up to 5 insurance companies to compare financial metrics side by side.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-[400px]" />
          </div>
        }
      >
        <CompareContent {...props} />
      </Suspense>
    </div>
  );
}
