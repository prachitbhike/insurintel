import { createClient } from "@/lib/supabase/server";
import { getSectorOverviews } from "@/lib/queries/sectors";
import { getIndustryTimeseries } from "@/lib/queries/metrics";
import { HeroBenchmarks } from "@/components/dashboard/hero-benchmarks";
import { IndustryTrendCharts } from "@/components/dashboard/industry-trend-charts";
import { SectorOpportunityCard } from "@/components/dashboard/sector-opportunity-card";
import {
  DisruptionTargetsTable,
  type DisruptionTarget,
} from "@/components/dashboard/disruption-targets-table";
import {
  BenchmarkStrip,
  type BenchmarkEntry,
} from "@/components/dashboard/benchmark-strip";
import { SECTORS } from "@/lib/data/sectors";
import { type LatestMetric } from "@/types/database";
import {
  aggregateIndustryByYear,
  aggregateSectorByYear,
  extractCompanyTimeseries,
} from "@/lib/metrics/aggregations";

export const revalidate = 3600;

const KEY_METRICS = [
  "combined_ratio",
  "expense_ratio",
  "premium_growth_yoy",
  "roe",
];

async function getOverviewData() {
  try {
    const supabase = await createClient();

    const [sectorOverviews, latestMetricsRes, industryTimeseries] =
      await Promise.all([
        getSectorOverviews(supabase),
        supabase.from("mv_latest_metrics").select("*"),
        getIndustryTimeseries(supabase, [
          ...KEY_METRICS,
          "net_premiums_earned",
        ]),
      ]);

    const latestMetrics = (latestMetricsRes.data ?? []) as LatestMetric[];

    // --- Hero benchmarks ---
    const premiums = latestMetrics.filter(
      (m) => m.metric_name === "net_premiums_earned"
    );
    const combinedRatios = latestMetrics.filter(
      (m) => m.metric_name === "combined_ratio"
    );
    const expenseRatios = latestMetrics.filter(
      (m) => m.metric_name === "expense_ratio"
    );
    const roes = latestMetrics.filter((m) => m.metric_name === "roe");
    const premiumGrowths = latestMetrics.filter(
      (m) => m.metric_name === "premium_growth_yoy"
    );

    const avg = (arr: LatestMetric[]) =>
      arr.length > 0
        ? arr.reduce((s, m) => s + m.metric_value, 0) / arr.length
        : null;
    const sum = (arr: LatestMetric[]) =>
      arr.length > 0 ? arr.reduce((s, m) => s + m.metric_value, 0) : null;

    const totalCompanies = new Set(latestMetrics.map((m) => m.company_id)).size;

    // --- Industry trend charts ---
    const efficiencyData = aggregateIndustryByYear(industryTimeseries, [
      "combined_ratio",
      "expense_ratio",
    ]);
    const growthData = aggregateIndustryByYear(industryTimeseries, [
      "premium_growth_yoy",
      "roe",
    ]);

    // --- Sector sparklines ---
    const sectorExpenseTrends = aggregateSectorByYear(
      industryTimeseries,
      "expense_ratio"
    );

    // --- Disruption targets (worst combined ratio first) ---
    const disruptionTargets: DisruptionTarget[] = [...combinedRatios]
      .sort((a, b) => b.metric_value - a.metric_value)
      .slice(0, 10)
      .map((m) => {
        const expense = expenseRatios.find(
          (e) => e.company_id === m.company_id
        );
        const roe = roes.find((r) => r.company_id === m.company_id);
        const trend = extractCompanyTimeseries(
          industryTimeseries,
          "combined_ratio",
          m.company_id
        );
        return {
          companyId: m.company_id,
          ticker: m.ticker,
          name: m.name,
          sector: m.sector,
          combinedRatio: m.metric_value,
          expenseRatio: expense?.metric_value ?? null,
          roe: roe?.metric_value ?? null,
          trend,
        };
      });

    // --- Benchmark targets (best-in-class) ---
    const bestCombined = [...combinedRatios].sort(
      (a, b) => a.metric_value - b.metric_value
    )[0];
    const bestExpense = [...expenseRatios].sort(
      (a, b) => a.metric_value - b.metric_value
    )[0];
    const bestRoe = [...roes].sort(
      (a, b) => b.metric_value - a.metric_value
    )[0];
    const bestGrowth = [...premiumGrowths].sort(
      (a, b) => b.metric_value - a.metric_value
    )[0];

    const benchmarks: BenchmarkEntry[] = [
      {
        label: "Lowest Combined Ratio",
        metricName: "combined_ratio",
        value: bestCombined?.metric_value ?? null,
        companyTicker: bestCombined?.ticker ?? "—",
        companyName: bestCombined?.name ?? "",
      },
      {
        label: "Lowest Expense Ratio",
        metricName: "expense_ratio",
        value: bestExpense?.metric_value ?? null,
        companyTicker: bestExpense?.ticker ?? "—",
        companyName: bestExpense?.name ?? "",
      },
      {
        label: "Highest ROE",
        metricName: "roe",
        value: bestRoe?.metric_value ?? null,
        companyTicker: bestRoe?.ticker ?? "—",
        companyName: bestRoe?.name ?? "",
      },
      {
        label: "Fastest Premium Growth",
        metricName: "premium_growth_yoy",
        value: bestGrowth?.metric_value ?? null,
        companyTicker: bestGrowth?.ticker ?? "—",
        companyName: bestGrowth?.name ?? "",
      },
    ];

    return {
      totalCompanies,
      totalPremium: sum(premiums),
      avgCombinedRatio: avg(combinedRatios),
      avgExpenseRatio: avg(expenseRatios),
      efficiencyData,
      growthData,
      sectorOverviews,
      sectorExpenseTrends,
      disruptionTargets,
      benchmarks,
    };
  } catch {
    return {
      totalCompanies: 0,
      totalPremium: null,
      avgCombinedRatio: null,
      avgExpenseRatio: null,
      efficiencyData: [],
      growthData: [],
      sectorOverviews: [],
      sectorExpenseTrends: {} as Record<string, number[]>,
      disruptionTargets: [],
      benchmarks: [],
    };
  }
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <div className="container space-y-10 px-4 py-8 md:px-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Insurance Industry Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Market intelligence for AI insurance founders — opportunity sizing,
          benchmarks & disruption targets.
        </p>
      </div>

      {/* Section 1: Hero Benchmarks */}
      <HeroBenchmarks
        totalPremium={data.totalPremium}
        avgCombinedRatio={data.avgCombinedRatio}
        avgExpenseRatio={data.avgExpenseRatio}
        trackedCompanies={data.totalCompanies}
      />

      {/* Section 2: Industry Trend Charts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Industry Trends</h2>
        <IndustryTrendCharts
          efficiencyData={data.efficiencyData}
          growthData={data.growthData}
        />
      </div>

      {/* Section 3: Sector Opportunity Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sector Opportunities</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SECTORS.map((sector) => {
            const overview = data.sectorOverviews.find(
              (s) => s.sector === sector.name
            );
            return (
              <SectorOpportunityCard
                key={sector.slug}
                sector={sector.name}
                label={sector.label}
                companyCount={overview?.companyCount ?? 0}
                avgExpenseRatio={
                  overview?.averages["expense_ratio"] ?? null
                }
                premiumGrowth={
                  overview?.averages["premium_growth_yoy"] ?? null
                }
                expenseRatioTrend={
                  data.sectorExpenseTrends[sector.name] ?? []
                }
                color={sector.color.replace("bg-", "hsl(var(--chart-1))")}
              />
            );
          })}
        </div>
      </div>

      {/* Section 4: Disruption Targets Table */}
      <DisruptionTargetsTable targets={data.disruptionTargets} />

      {/* Section 5: Benchmark Targets */}
      <BenchmarkStrip benchmarks={data.benchmarks} />
    </div>
  );
}
