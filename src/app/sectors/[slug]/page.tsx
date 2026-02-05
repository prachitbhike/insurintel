import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SECTORS, getSectorBySlug } from "@/lib/data/sectors";
import { getCompaniesBySector } from "@/lib/queries/companies";
import { getSectorAverages, getSectorRankings } from "@/lib/queries/sectors";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectorRankingsChart } from "@/components/sectors/sector-rankings-chart";
import { CompaniesTable } from "@/components/companies/companies-table";
import { type CompanyListItem } from "@/types/company";
import { type CompanyRanking, type LatestMetric } from "@/types/database";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSectorBySlug(slug);
  if (!sector) return { title: "Sector Not Found" };

  return {
    title: sector.label,
    description: `${sector.description} View KPI averages, company rankings, and trends.`,
  };
}

export default async function SectorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sector = getSectorBySlug(slug);
  if (!sector) notFound();

  let averages: Record<string, number> = {};
  let rankings: Record<string, CompanyRanking[]> = {};
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

    // Fetch rankings for each key metric
    const rankingPromises = sector.key_metrics.map(async (metric) => {
      const data = await getSectorRankings(supabase, sector.name, metric);
      return { metric, data };
    });
    const rankingResults = await Promise.all(rankingPromises);
    for (const { metric, data } of rankingResults) {
      rankings[metric] = data;
    }

    // Build table data
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

  return (
    <div className="container space-y-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{sector.label}</h1>
        <p className="mt-1 text-muted-foreground">{sector.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {sector.key_metrics.map((metric) => (
          <KpiCard
            key={metric}
            title={metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            metricName={metric}
            value={averages[metric] ?? null}
            tooltip={`Sector average for ${metric.replace(/_/g, " ")}`}
          />
        ))}
      </div>

      <SectorRankingsChart
        rankings={rankings}
        availableMetrics={sector.key_metrics}
      />

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
  );
}
