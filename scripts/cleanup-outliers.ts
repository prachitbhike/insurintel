/**
 * InsurIntel — Outlier Data Cleanup
 *
 * Deletes derived metrics that are meaningless due to:
 * 1. AON negative equity FY2022-2023 (ROE, D/E, BVPS distorted)
 * 2. WRB Class A only shares_outstanding (BVPS ~$21K vs realistic ~$45)
 *
 * Run: npx tsx scripts/cleanup-outliers.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

interface DeleteTarget {
  ticker: string;
  metrics: string[];
  years: number[];
  reason: string;
}

const TARGETS: DeleteTarget[] = [
  {
    ticker: "ALL",
    metrics: ["losses_incurred", "loss_ratio", "combined_ratio"],
    years: [2022, 2023, 2024],
    reason: "Allstate repurposed XBRL tag for reserve development only (~$2.9B vs actual ~$40B+)",
  },
  {
    ticker: "AON",
    metrics: ["roe", "debt_to_equity", "book_value_per_share"],
    years: [2022, 2023],
    reason: "Negative equity from share buybacks makes ratios meaningless (-603% ROE, -22.9x D/E)",
  },
  {
    ticker: "WRB",
    metrics: ["book_value_per_share"],
    years: [2022, 2023, 2024],
    reason: "DEI shares_outstanding reports Class A only (~285K shares) → BVPS inflated to $16K-$21K",
  },
];

async function main() {
  console.log("=".repeat(80));
  console.log("  INSURINTEL OUTLIER CLEANUP");
  console.log("=".repeat(80));

  // Get company IDs
  const { data: companies } = await supabase.from("companies").select("id, ticker");
  if (!companies) { console.error("Failed to fetch companies"); process.exit(1); }

  const tickerToId = new Map(companies.map(c => [c.ticker, c.id]));
  let totalDeleted = 0;

  for (const target of TARGETS) {
    const companyId = tickerToId.get(target.ticker);
    if (!companyId) {
      console.log(`\n  SKIP: ${target.ticker} not found in database`);
      continue;
    }

    console.log(`\n  ${target.ticker}: ${target.reason}`);

    for (const metric of target.metrics) {
      for (const year of target.years) {
        // Check if exists first
        const { data: existing } = await supabase
          .from("financial_metrics")
          .select("id, metric_value")
          .eq("company_id", companyId)
          .eq("metric_name", metric)
          .eq("fiscal_year", year)
          .eq("period_type", "annual");

        if (!existing || existing.length === 0) {
          console.log(`    ${metric} FY${year}: already absent`);
          continue;
        }

        const { error } = await supabase
          .from("financial_metrics")
          .delete()
          .eq("company_id", companyId)
          .eq("metric_name", metric)
          .eq("fiscal_year", year)
          .eq("period_type", "annual");

        if (error) {
          console.error(`    ${metric} FY${year}: DELETE FAILED — ${error.message}`);
        } else {
          const val = existing[0].metric_value;
          console.log(`    ${metric} FY${year}: DELETED (was ${val})`);
          totalDeleted++;
        }
      }
    }
  }

  // Refresh materialized views so sector averages update
  if (totalDeleted > 0) {
    console.log("\n  Refreshing materialized views...");
    const { error } = await supabase.rpc("refresh_all_materialized_views");
    if (error) {
      console.error(`  View refresh failed: ${error.message}`);
    } else {
      console.log("  Views refreshed.");
    }
  }

  console.log(`\n  Total deleted: ${totalDeleted}`);
  console.log("=".repeat(80));
}

main().catch(err => { console.error("CLEANUP FAILED:", err); process.exit(1); });
