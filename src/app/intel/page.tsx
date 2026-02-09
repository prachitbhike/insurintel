import { type Metadata } from "next";
import { Suspense } from "react";
import { getBulkScoringData, preloadBulkScoringData } from "@/lib/queries/metrics";
import { computeProspectScoresBatch } from "@/lib/scoring/prospect-score";
import { computeBestTamPerCompany } from "@/lib/scoring/tam-calculator";
import { OpportunitiesClient } from "@/components/opportunities/opportunities-client";
import { type ProspectRow } from "@/components/opportunities/prospect-table";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Company Intel",
  description:
    "Insurance companies ranked by composite efficiency score, derived from SEC filing data.",
};

async function OpportunitiesContent() {
  let rows: ProspectRow[] = [];

  try {
    const scoringData = await getBulkScoringData();
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
  preloadBulkScoringData();
  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Company Intel
        </p>
        <h1 className="text-3xl font-display tracking-tight">Efficiency Rankings</h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Insurance companies ranked by composite efficiency score, derived from SEC filing data.
          All metrics sourced from annual 10-K filings via SEC EDGAR XBRL.
        </p>
        <details className="mt-3 text-sm text-muted-foreground max-w-2xl">
          <summary className="cursor-pointer text-xs font-medium text-foreground/70 hover:text-foreground transition-colors">
            How the score is calculated
          </summary>
          <div className="mt-2 space-y-2 text-xs leading-relaxed border-l-2 border-muted pl-3">
            <p>
              The efficiency score (0-100) is a weighted composite of four dimensions, normalized within each sector:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-medium">Operational gap (40%)</span> — How far the company{"'"}s key metric
                (combined ratio for P&C/Re, MLR for Health, ROE for Life, D/E for Brokers) deviates from sector
                peers, using min-max normalization.
              </li>
              <li>
                <span className="font-medium">Trend (25%)</span> — 3-year linear slope of the key metric and ROE.
                A worsening trend scores higher. Threshold: {">"}0.5pp/year = worsening, {"<"}-0.5pp/year = improving.
              </li>
              <li>
                <span className="font-medium">Revenue scale (20%)</span> — Net premiums earned or revenue,
                linearly scaled from $0 (score 0) to $100B+ (score 100).
              </li>
              <li>
                <span className="font-medium">Size fit (15%)</span> — Log-normal curve centered at ~$20B revenue.
                Mid-size companies score highest.
              </li>
            </ul>
            <p>
              Requires at least 2 of 4 dimensions to produce a score.
              Missing dimensions are redistributed proportionally across available ones.
            </p>
            <p>
              <span className="font-medium">Expense Gap $</span> = (company expense ratio - sector best) / 100 x net premiums earned.
              Applies to P&C and Reinsurance only. Health uses admin margin pool (1 - MLR) x premiums.
              Brokers and Life show N/A (different business models).
            </p>
          </div>
        </details>
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
