import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSectorOverviews, getSectorAverages } from "@/lib/queries/sectors";
import { getCompaniesBySector } from "@/lib/queries/companies";
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
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectorTrendCharts, type SectorTrendData } from "@/components/sectors/sector-trend-charts";
import { CompaniesTable } from "@/components/companies/companies-table";
import { SECTORS, getSectorBySlug } from "@/lib/data/sectors";
import { type CompanyListItem } from "@/types/company";
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

async function getSectorDetailData(slug: string) {
  const sector = getSectorBySlug(slug);
  if (!sector) return null;

  let averages: Record<string, number> = {};
  let trendData: SectorTrendData = {};
  let tickers: string[] = [];
  let tableData: CompanyListItem[] = [];

  try {
    const supabase = await createClient();
    const [sectorAvgs, companies, metricsRes] = await Promise.all([
      getSectorAverages(supabase, sector.name),
      getCompaniesBySector(supabase, sector.name),
      supabase
        .from("mv_latest_metrics")
        .select("*")
        .eq("sector", sector.name),
    ]);

    for (const avg of sectorAvgs) {
      averages[avg.metric_name] = avg.avg_value;
    }

    // Fetch timeseries for all companies in this sector
    const companyIds = companies.map((c) => c.id);
    tickers = companies.map((c) => c.ticker).sort();

    const { data: tsRows } = await supabase
      .from("mv_metric_timeseries")
      .select("company_id, ticker, metric_name, metric_value, fiscal_year")
      .in("company_id", companyIds)
      .in("metric_name", sector.key_metrics)
      .eq("period_type", "annual")
      .order("fiscal_year", { ascending: true });

    // Build trend data: { metric -> [{ year, TICKER1: val, TICKER2: val, ... }] }
    const metricYearMap = new Map<string, Map<number, Map<string, number>>>();
    for (const row of tsRows ?? []) {
      if (!metricYearMap.has(row.metric_name)) {
        metricYearMap.set(row.metric_name, new Map());
      }
      const yearMap = metricYearMap.get(row.metric_name)!;
      if (!yearMap.has(row.fiscal_year)) {
        yearMap.set(row.fiscal_year, new Map());
      }
      yearMap.get(row.fiscal_year)!.set(row.ticker, row.metric_value);
    }

    for (const [metric, yearMap] of metricYearMap) {
      const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
      trendData[metric] = years.map((year) => {
        const tickerVals = yearMap.get(year)!;
        const entry: Record<string, number | null> = { year };
        for (const t of tickers) {
          entry[t] = tickerVals.get(t) ?? null;
        }
        return entry as { year: number; [ticker: string]: number | null };
      });
    }

    const metrics = (metricsRes.data ?? []) as LatestMetric[];
    const metricsByCompany = new Map<string, Map<string, number>>();
    for (const m of metrics) {
      if (!metricsByCompany.has(m.company_id)) {
        metricsByCompany.set(m.company_id, new Map());
      }
      metricsByCompany.get(m.company_id)!.set(m.metric_name, m.metric_value);
    }

    tableData = companies.map((c) => {
      const cm = metricsByCompany.get(c.id);
      return {
        id: c.id,
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        sub_sector: c.sub_sector,
        combined_ratio: cm?.get("combined_ratio") ?? null,
        roe: cm?.get("roe") ?? null,
        net_premiums_earned: cm?.get("net_premiums_earned") ?? null,
        premium_growth_yoy: cm?.get("premium_growth_yoy") ?? null,
        eps: cm?.get("eps") ?? null,
        sparkline_data: [],
      };
    });
  } catch {
    // Gracefully handle
  }

  return { sector, averages, trendData, tickers, tableData };
}

interface HomePageProps {
  searchParams: Promise<{ sector?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { sector: sectorSlug } = await searchParams;

  // Validate sector slug — fall back to industry view on invalid
  const sectorDetail = sectorSlug ? await getSectorDetailData(sectorSlug) : null;
  const isIndustryView = !sectorDetail;

  // Only fetch overview data when showing industry view
  const overviewData = isIndustryView ? await getOverviewData() : null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b border-border/50 bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="container px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-3">
              {sectorDetail ? sectorDetail.sector.label : "Market Intelligence"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {sectorDetail
                ? sectorDetail.sector.label
                : "Insurance Industry Dashboard"}
            </h1>
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              {sectorDetail
                ? sectorDetail.sector.description
                : "Opportunity sizing, efficiency benchmarks & disruption targets for AI insurance founders."}
            </p>
          </div>
          {isIndustryView && overviewData && (
            <div className="mt-8">
              <HeroBenchmarks
                totalPremium={overviewData.totalPremium}
                avgCombinedRatio={overviewData.avgCombinedRatio}
                avgExpenseRatio={overviewData.avgExpenseRatio}
                trackedCompanies={overviewData.totalCompanies}
              />
            </div>
          )}
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
        {isIndustryView && overviewData ? (
          <>
            {/* Industry Trends */}
            <section className="py-10 border-b border-border/40">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-lg font-semibold tracking-tight">Industry Trends</h2>
                <span className="text-xs text-muted-foreground">5-year averages across all tracked insurers</span>
              </div>
              <IndustryTrendCharts
                efficiencyData={overviewData.efficiencyData}
                growthData={overviewData.growthData}
              />
            </section>

            {/* Sector Opportunity Cards */}
            <section className="py-10 border-b border-border/40">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-lg font-semibold tracking-tight">Sector Opportunities</h2>
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
            <section className="py-10 border-b border-border/40">
              <DisruptionTargetsTable targets={overviewData.disruptionTargets} />
            </section>

            {/* Benchmarks */}
            <section className="py-10 pb-14">
              <BenchmarkStrip benchmarks={overviewData.benchmarks} />
            </section>
          </>
        ) : sectorDetail ? (
          <div className="space-y-6 py-8">
            {/* Sector KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sectorDetail.sector.key_metrics.map((metric) => (
                <KpiCard
                  key={metric}
                  title={metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  metricName={metric}
                  value={sectorDetail.averages[metric] ?? null}
                  tooltip={`Sector average for ${metric.replace(/_/g, " ")}`}
                />
              ))}
            </div>

            {/* Trend Charts */}
            <SectorTrendCharts
              trendData={sectorDetail.trendData}
              availableMetrics={sectorDetail.sector.key_metrics}
              tickers={sectorDetail.tickers}
            />

            {/* Companies Table */}
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Companies in {sectorDetail.sector.label}
              </h2>
              <CompaniesTable
                data={sectorDetail.tableData}
                initialSectorFilter={[sectorDetail.sector.name]}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
