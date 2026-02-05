import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyFacts } from "@/lib/edgar/client";
import { parseCompanyFacts } from "@/lib/edgar/parser";
import {
  calculateDerivedMetrics,
  calculateYoyGrowth,
} from "@/lib/metrics/calculator";
import { getCompaniesNeedingRefresh } from "@/lib/queries/companies";

const BATCH_SIZE = 8;

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const companies = await getCompaniesNeedingRefresh(supabase, BATCH_SIZE);
    if (companies.length === 0) {
      return NextResponse.json({ message: "No companies to process" });
    }

    const results: { ticker: string; metrics: number; errors: string[] }[] = [];

    for (const company of companies) {
      const errors: string[] = [];
      let metricsCount = 0;

      try {
        const facts = await getCompanyFacts(company.cik);
        const rawMetrics = parseCompanyFacts(facts);

        // Update entity name if we got it
        if (facts.entityName) {
          await supabase
            .from("companies")
            .update({ entity_name: facts.entityName })
            .eq("id", company.id);
        }

        // Group metrics by (fiscal_year, fiscal_quarter, period_type)
        const periodGroups = new Map<string, typeof rawMetrics>();
        for (const m of rawMetrics) {
          const key = `${m.fiscal_year}|${m.fiscal_quarter}|${m.period_type}`;
          if (!periodGroups.has(key)) periodGroups.set(key, []);
          periodGroups.get(key)!.push(m);
        }

        const allMetrics = [...rawMetrics];

        // Calculate derived metrics for each period
        for (const [, periodMetrics] of periodGroups) {
          const first = periodMetrics[0];
          const derived = calculateDerivedMetrics(
            rawMetrics,
            first.fiscal_year,
            first.fiscal_quarter,
            first.period_type
          );
          allMetrics.push(...derived);
        }

        // Calculate YoY growth for annual data
        const annualYears = [
          ...new Set(
            rawMetrics
              .filter((m) => m.period_type === "annual")
              .map((m) => m.fiscal_year)
          ),
        ].sort();

        for (let i = 1; i < annualYears.length; i++) {
          const currentYear = rawMetrics.filter(
            (m) =>
              m.fiscal_year === annualYears[i] && m.period_type === "annual"
          );
          const priorYear = rawMetrics.filter(
            (m) =>
              m.fiscal_year === annualYears[i - 1] &&
              m.period_type === "annual"
          );
          const growth = calculateYoyGrowth(currentYear, priorYear);
          allMetrics.push(...growth);
        }

        // Upsert metrics into database
        for (const metric of allMetrics) {
          const { error } = await supabase.from("financial_metrics").upsert(
            {
              company_id: company.id,
              metric_name: metric.metric_name,
              metric_value: metric.value,
              unit: metric.unit,
              period_type: metric.period_type,
              fiscal_year: metric.fiscal_year,
              fiscal_quarter: metric.fiscal_quarter,
              period_start_date: metric.period_start_date,
              period_end_date: metric.period_end_date,
              is_derived: metric.accession_number === "derived",
              source: metric.accession_number === "derived" ? "derived" : "edgar",
              accession_number:
                metric.accession_number === "derived"
                  ? null
                  : metric.accession_number,
              filed_at: metric.filed_at,
            },
            {
              onConflict:
                "company_id,metric_name,period_type,fiscal_year,fiscal_quarter",
            }
          );

          if (error) {
            errors.push(`${metric.metric_name}@${metric.fiscal_year}: ${error.message}`);
          } else {
            metricsCount++;
          }
        }

        // Update last_ingested_at
        await supabase
          .from("companies")
          .update({ last_ingested_at: new Date().toISOString() })
          .eq("id", company.id);
      } catch (err) {
        errors.push(
          `Fatal: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      results.push({ ticker: company.ticker, metrics: metricsCount, errors });
    }

    return NextResponse.json({
      message: `Processed ${companies.length} companies`,
      results,
    });
  } catch (err) {
    console.error("Ingestion error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
