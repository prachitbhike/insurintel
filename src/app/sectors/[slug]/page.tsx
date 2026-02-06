import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSectorAverages } from "@/lib/queries/sectors";
import { getCompaniesBySector } from "@/lib/queries/companies";
import { SECTORS, getSectorBySlug } from "@/lib/data/sectors";
import { SectorTrendCharts, type SectorTrendData } from "@/components/sectors/sector-trend-charts";
import { CompaniesTable } from "@/components/companies/companies-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { type CompanyListItem } from "@/types/company";
import { type LatestMetric, type SectorAverage } from "@/types/database";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSectorBySlug(slug);
  if (!sector) return { title: "Sector Not Found" };

  return {
    title: `${sector.label} Sector`,
    description: sector.description,
  };
}

interface ComputedHeroStat {
  title: string;
  metricName: string;
  value: number | null;
  tooltip: string;
}

export default async function SectorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sector = getSectorBySlug(slug);
  if (!sector) notFound();

  const averages: Record<string, number> = {};
  let sectorAvgRows: SectorAverage[] = [];
  const trendData: SectorTrendData = {};
  const quarterlyTrendData: SectorTrendData = {};
  let tickers: string[] = [];
  let tableData: CompanyListItem[] = [];
  let heroStats: ComputedHeroStat[] = [];

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

    sectorAvgRows = sectorAvgs;
    for (const avg of sectorAvgs) {
      averages[avg.metric_name] = avg.avg_value;
    }

    const companyIds = companies.map((c) => c.id);
    tickers = companies.map((c) => c.ticker).sort();

    const [{ data: tsRows }, { data: qTsRows }] = await Promise.all([
      supabase
        .from("mv_metric_timeseries")
        .select("company_id, ticker, metric_name, metric_value, fiscal_year, fiscal_quarter")
        .in("company_id", companyIds)
        .in("metric_name", sector.key_metrics)
        .eq("period_type", "annual")
        .order("fiscal_year", { ascending: true }),
      supabase
        .from("mv_metric_timeseries")
        .select("company_id, ticker, metric_name, metric_value, fiscal_year, fiscal_quarter")
        .in("company_id", companyIds)
        .in("metric_name", sector.key_metrics)
        .eq("period_type", "quarterly")
        .order("fiscal_year", { ascending: true }),
    ]);

    // Build annual trend data
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
        const entry: Record<string, string | number | null> = { period: String(year) };
        for (const t of tickers) {
          entry[t] = tickerVals.get(t) ?? null;
        }
        return entry as { period: string; [ticker: string]: string | number | null };
      });
    }

    // Build quarterly trend data
    const metricQuarterMap = new Map<string, Map<string, Map<string, number>>>();
    for (const row of qTsRows ?? []) {
      if (!metricQuarterMap.has(row.metric_name)) {
        metricQuarterMap.set(row.metric_name, new Map());
      }
      const periodKey = `${row.fiscal_year} Q${row.fiscal_quarter}`;
      const qMap = metricQuarterMap.get(row.metric_name)!;
      if (!qMap.has(periodKey)) {
        qMap.set(periodKey, new Map());
      }
      qMap.get(periodKey)!.set(row.ticker, row.metric_value);
    }

    for (const [metric, qMap] of metricQuarterMap) {
      const periods = Array.from(qMap.keys()).sort((a, b) => {
        const [aY, aQ] = a.split(" Q").map(Number);
        const [bY, bQ] = b.split(" Q").map(Number);
        return (aY * 10 + aQ) - (bY * 10 + bQ);
      });
      quarterlyTrendData[metric] = periods.map((period) => {
        const tickerVals = qMap.get(period)!;
        const entry: Record<string, string | number | null> = { period };
        for (const t of tickers) {
          entry[t] = tickerVals.get(t) ?? null;
        }
        return entry as { period: string; [ticker: string]: string | number | null };
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

    heroStats = sector.hero_stats.map((hs) => {
      let value: number | null = null;

      if (hs.aggregation === "avg") {
        const avgRow = sectorAvgRows.find((a) => a.metric_name === hs.metricName);
        value = avgRow?.avg_value ?? null;
      } else if (hs.aggregation === "sum") {
        const companyValues = new Map<string, number>();
        for (const m of metrics) {
          if (m.metric_name === hs.metricName) {
            companyValues.set(m.company_id, m.metric_value);
          }
        }
        if (companyValues.size > 0) {
          value = 0;
          for (const v of companyValues.values()) {
            value += v;
          }
        }
      } else if (hs.aggregation === "spread") {
        const avgRow = sectorAvgRows.find((a) => a.metric_name === hs.metricName);
        if (avgRow) {
          value = avgRow.max_value - avgRow.min_value;
        }
      }

      return {
        title: hs.title,
        metricName: hs.metricName,
        value,
        tooltip: hs.tooltip,
      };
    });

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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b border-border/50 bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="container px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-3">
              {sector.label}
            </p>
            <h1 className="text-3xl font-display tracking-tight md:text-4xl">
              {sector.label}
            </h1>
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              {sector.description}
            </p>
          </div>
          {heroStats.length > 0 && (
            <div className="mt-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {heroStats.map((stat, i) => (
                  <Card
                    key={i}
                    className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                      <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight font-mono">
                        {formatMetricValue(stat.metricName, stat.value)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="container px-4 md:px-6">
        <div className="space-y-6 py-8">
          {/* AI Opportunity Narrative */}
          {sector.ai_opportunities.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary/60" />
                <h3 className="text-sm font-semibold">
                  Where AI Wins in {sector.label}
                </h3>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {sector.ai_opportunities.map((opp, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary/40 shrink-0">-</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trend Charts */}
          <SectorTrendCharts
            trendData={trendData}
            quarterlyTrendData={quarterlyTrendData}
            availableMetrics={sector.key_metrics}
            tickers={tickers}
          />

          {/* Companies Table */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Companies in {sector.label}
            </h2>
            <CompaniesTable
              data={tableData}
              initialSectorFilter={[sector.name]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
