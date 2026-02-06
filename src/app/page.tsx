import { Suspense } from "react";
import { redirect } from "next/navigation";
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
import { SectorToggle } from "@/components/dashboard/sector-toggle";
import { type LatestMetric } from "@/types/database";
import { formatMetricValue } from "@/lib/metrics/formatters";
import {
  aggregateIndustryByYear,
  aggregateSectorByYear,
  extractCompanyTimeseries,
} from "@/lib/metrics/aggregations";
import { SECTORS, getSectorBySlug } from "@/lib/data/sectors";

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

    const efficiencyData = aggregateIndustryByYear(industryTimeseries, [
      "combined_ratio",
      "expense_ratio",
    ]);
    const growthData = aggregateIndustryByYear(industryTimeseries, [
      "premium_growth_yoy",
      "roe",
    ]);

    const sectorExpenseTrends = aggregateSectorByYear(
      industryTimeseries,
      "expense_ratio"
    );

    const bestExpenseRatioValue = expenseRatios.length > 0
      ? Math.min(...expenseRatios.map((e) => e.metric_value))
      : 0;

    const disruptionTargets: DisruptionTarget[] = [...combinedRatios]
      .sort((a, b) => b.metric_value - a.metric_value)
      .slice(0, 10)
      .map((m) => {
        const expense = expenseRatios.find(
          (e) => e.company_id === m.company_id
        );
        const premium = premiums.find(
          (p) => p.company_id === m.company_id
        );
        const roe = roes.find((r) => r.company_id === m.company_id);
        const trend = extractCompanyTimeseries(
          industryTimeseries,
          "combined_ratio",
          m.company_id
        );
        const expenseVal = expense?.metric_value ?? null;
        const premiumVal = premium?.metric_value ?? null;
        const automationSavings =
          expenseVal != null && premiumVal != null && expenseVal > bestExpenseRatioValue
            ? ((expenseVal - bestExpenseRatioValue) / 100) * premiumVal
            : null;
        return {
          companyId: m.company_id,
          ticker: m.ticker,
          name: m.name,
          sector: m.sector,
          combinedRatio: m.metric_value,
          expenseRatio: expenseVal,
          roe: roe?.metric_value ?? null,
          automationSavings,
          trend,
        };
      });

    let totalAutomationTAM = 0;
    for (const expense of expenseRatios) {
      const premium = premiums.find(
        (p) => p.company_id === expense.company_id
      );
      if (premium && expense.metric_value > bestExpenseRatioValue) {
        totalAutomationTAM +=
          ((expense.metric_value - bestExpenseRatioValue) / 100) *
          premium.metric_value;
      }
    }

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
      totalAutomationTAM,
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
      totalAutomationTAM: 0,
      efficiencyData: [],
      growthData: [],
      sectorOverviews: [],
      sectorExpenseTrends: {} as Record<string, number[]>,
      disruptionTargets: [],
      benchmarks: [],
    };
  }
}

interface HomePageProps {
  searchParams: Promise<{ sector?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { sector: sectorSlug } = await searchParams;

  // Redirect legacy ?sector= URLs to /sectors/[slug]
  if (sectorSlug) {
    const sector = getSectorBySlug(sectorSlug);
    if (sector) {
      redirect(`/sectors/${sectorSlug}`);
    }
  }

  const overviewData = await getOverviewData();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b border-border/50 bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="container px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-3">
              Market Intelligence
            </p>
            <h1 className="text-3xl font-display tracking-tight md:text-4xl">
              Insurance Industry Dashboard
            </h1>
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              Opportunity sizing, efficiency benchmarks & disruption targets for AI insurance founders.
            </p>
          </div>
          <div className="mt-8">
            <HeroBenchmarks
              totalPremium={overviewData.totalPremium}
              avgCombinedRatio={overviewData.avgCombinedRatio}
              avgExpenseRatio={overviewData.avgExpenseRatio}
              trackedCompanies={overviewData.totalCompanies}
              totalAutomationTAM={overviewData.totalAutomationTAM}
            />
          </div>
        </div>
      </section>

      {/* Sector Toggle */}
      <div className="container px-4 md:px-6 pt-6">
        <Suspense fallback={null}>
          <SectorToggle />
        </Suspense>
      </div>

      {/* Main Content */}
      <div className="container px-4 md:px-6">
        {/* Industry Trends */}
        <section className="py-14 border-b border-border/40 animate-fade-up delay-1">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="text-2xl font-display tracking-tight">Industry Trends</h2>
            <span className="text-xs text-muted-foreground">5-year averages across all tracked insurers</span>
          </div>
          <IndustryTrendCharts
            efficiencyData={overviewData.efficiencyData}
            growthData={overviewData.growthData}
          />
        </section>

        {/* Sector Opportunity Cards */}
        <section className="py-14 border-b border-border/40 animate-fade-up delay-2">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="text-2xl font-display tracking-tight">Sector Opportunities</h2>
            <span className="text-xs text-muted-foreground">Higher expense ratio = more automation upside</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SECTORS.map((sector) => {
              const overview = overviewData.sectorOverviews.find(
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
                    overviewData.sectorExpenseTrends[sector.name] ?? []
                  }
                  color={sector.color.replace("bg-", "var(--chart-1)")}
                />
              );
            })}
          </div>
        </section>

        {/* Disruption Targets */}
        <section className="py-14 border-b border-border/40 animate-fade-up delay-3">
          <DisruptionTargetsTable targets={overviewData.disruptionTargets} />
        </section>

        {/* Benchmarks */}
        <section className="py-14 animate-fade-up delay-4">
          <BenchmarkStrip benchmarks={overviewData.benchmarks} />
        </section>
      </div>
    </div>
  );
}
