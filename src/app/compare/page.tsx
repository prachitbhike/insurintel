import { type Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAllCompanies } from "@/lib/queries/companies";
import { getComparisonData } from "@/lib/queries/compare";
import { ComparePageClient } from "@/components/compare/compare-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Compare Companies",
  description:
    "Compare financial metrics across up to 5 insurance companies side by side.",
};

interface PageProps {
  searchParams: Promise<{ companies?: string }>;
}

async function CompareContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const companiesParam = params.companies;
  const initialTickers = companiesParam
    ? companiesParam.split(",").slice(0, 5)
    : [];

  let allCompanies: { ticker: string; name: string; sector: string }[] = [];
  let initialData = null;

  try {
    const supabase = await createClient();
    const companies = await getAllCompanies(supabase);
    allCompanies = companies.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
    }));

    if (initialTickers.length > 0) {
      initialData = await getComparisonData(supabase, initialTickers);
    }
  } catch {
    // Gracefully handle
  }

  return (
    <ComparePageClient
      allCompanies={allCompanies}
      initialData={initialData}
      initialTickers={initialTickers}
    />
  );
}

export default function ComparePage(props: PageProps) {
  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Compare Companies
        </h1>
        <p className="mt-1 text-muted-foreground">
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
