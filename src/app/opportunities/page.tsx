import { type Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBulkScoringData } from "@/lib/queries/metrics";
import { computeProspectScoresBatch } from "@/lib/scoring/prospect-score";
import { computeBestTamPerCompany } from "@/lib/scoring/tam-calculator";
import { OpportunitiesClient } from "@/components/opportunities/opportunities-client";
import { type ProspectRow } from "@/components/opportunities/prospect-table";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Opportunities",
  description:
    "Insurance companies ranked by prospect attractiveness, backed by SEC filing data.",
};

async function OpportunitiesContent() {
  let rows: ProspectRow[] = [];

  try {
    const supabase = await createClient();
    const scoringData = await getBulkScoringData(supabase);
    const prospectScores = computeProspectScoresBatch(scoringData);

    const scoreMap = new Map(prospectScores.map((s) => [s.companyId, s]));

    rows = scoringData.companies.map((c) => {
      const score = scoreMap.get(c.id);
      const metrics = scoringData.latestMetrics[c.id] ?? {};
      const sectorStats = scoringData.sectorAverages[c.sector] ?? {};

      const bestTam = computeBestTamPerCompany(
        { id: c.id, ticker: c.ticker, name: c.name, sector: c.sector, metrics },
        sectorStats,
      );

      return {
        companyId: c.id,
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        score: score?.totalScore ?? null,
        painMetricName: score?.painMetricName ?? null,
        painMetricValue: score?.painMetricValue ?? null,
        painVsSectorAvg: score?.painVsSectorAvg ?? null,
        trendDirection: score?.trendDirection ?? null,
        revenueBase: score?.revenueBase ?? null,
        addressableSpend: bestTam?.bestResult.addressableSpend ?? null,
      };
    });
  } catch {
    // Gracefully handle
  }

  return <OpportunitiesClient rows={rows} />;
}

export default function OpportunitiesPage() {
  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Opportunities
        </p>
        <h1 className="text-3xl font-display tracking-tight">Prospect Discovery</h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Insurance companies ranked by prospect attractiveness, backed by SEC filing data.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        }
      >
        <OpportunitiesContent />
      </Suspense>
    </div>
  );
}
