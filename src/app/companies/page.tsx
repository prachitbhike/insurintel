import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAllCompanies } from "@/lib/queries/companies";
import { CompaniesTable } from "@/components/companies/companies-table";
import { type CompanyListItem } from "@/types/company";
import { type LatestMetric } from "@/types/database";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse and filter 60+ publicly traded insurance companies with key financial metrics.",
};

export const revalidate = 3600;

export default async function CompaniesPage() {
  let tableData: CompanyListItem[] = [];

  try {
    const supabase = await createClient();
    const [companies, metricsRes, timeseriesRes] = await Promise.all([
      getAllCompanies(supabase),
      supabase.from("mv_latest_metrics").select("*"),
      supabase
        .from("mv_metric_timeseries")
        .select("*")
        .eq("metric_name", "net_income")
        .eq("period_type", "annual")
        .order("fiscal_year", { ascending: true }),
    ]);

    const metrics = (metricsRes.data ?? []) as LatestMetric[];
    const timeseries = timeseriesRes.data ?? [];

    const metricsByCompany = new Map<string, Map<string, number>>();
    for (const m of metrics) {
      if (!metricsByCompany.has(m.company_id)) {
        metricsByCompany.set(m.company_id, new Map());
      }
      metricsByCompany.get(m.company_id)!.set(m.metric_name, m.metric_value);
    }

    const sparklineByCompany = new Map<string, number[]>();
    for (const ts of timeseries) {
      const key = ts.company_id;
      if (!sparklineByCompany.has(key)) sparklineByCompany.set(key, []);
      sparklineByCompany.get(key)!.push(ts.metric_value);
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
        sparkline_data: sparklineByCompany.get(c.id) ?? [],
      };
    });
  } catch {
    // Gracefully handle missing database
  }

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="mt-1 text-muted-foreground">
          Browse {tableData.length || "60+"} publicly traded insurance companies. Click a row for details.
        </p>
      </div>
      <CompaniesTable data={tableData} />
    </div>
  );
}
