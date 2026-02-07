/**
 * InsurIntel — Outlier Data Cleanup
 *
 * Deletes metrics that are meaningless or misleading due to:
 * 1. XBRL tag mismatches (wrong data from correct tag)
 * 2. Structural company issues (negative equity, Class-A only shares)
 * 3. Tag alias overlap (medical_claims_expense on non-Health companies)
 * 4. Broker premiums (distributors, not carriers)
 * 5. Financial guaranty ratios (AGO — bond insurance, not traditional P&C)
 *
 * MUST be run after every re-seed: npx tsx scripts/cleanup-outliers.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

// ========== Per-ticker targeted deletes ==========

interface DeleteTarget {
  ticker: string;
  metrics: string[];
  years: number[];
  reason: string;
}

const TARGETS: DeleteTarget[] = [
  // Allstate: XBRL tag reports reserve development only, not actual losses
  {
    ticker: "ALL",
    metrics: ["losses_incurred", "loss_ratio", "combined_ratio"],
    years: [2022, 2023, 2024],
    reason: "Allstate repurposed XBRL tag for reserve development only (~$2.9B vs actual ~$40B+)",
  },
  // AON: negative equity from aggressive share buybacks
  {
    ticker: "AON",
    metrics: ["roe", "debt_to_equity", "book_value_per_share"],
    years: [2022, 2023],
    reason: "Negative equity from share buybacks makes ratios meaningless (-603% ROE, -22.9x D/E)",
  },
  // WRB: DEI shares reports only Class A (~285K shares vs ~330M total)
  {
    ticker: "WRB",
    metrics: ["book_value_per_share"],
    years: [2022, 2023, 2024],
    reason: "DEI shares_outstanding reports Class A only (~285K shares) → BVPS inflated to $16K-$21K",
  },
  // AGO: financial guaranty (bond insurance) — loss/combined ratios are meaningless
  // in P&C context (reserve releases cause negative ratios, e.g. -53%)
  {
    ticker: "AGO",
    metrics: ["loss_ratio", "combined_ratio"],
    years: [2021, 2022, 2023, 2024],
    reason: "Financial guaranty company — reserve releases cause negative/misleading ratios in P&C context",
  },
  // VOYA: retirement/investment company — negative premiums from tag mismatch
  {
    ticker: "VOYA",
    metrics: ["net_premiums_earned"],
    years: [2021, 2022, 2023, 2024],
    reason: "Retirement/investment company — negative premiums from XBRL tag mismatch",
  },
  // BRO: broker (distributor, not carrier) — premiums are tag mismatch artifacts
  {
    ticker: "BRO",
    metrics: ["net_premiums_earned"],
    years: [2021, 2022, 2023, 2024],
    reason: "Broker (distributor, not carrier) — premiums are XBRL tag mismatch artifacts ($18K FY2021)",
  },
];

// ========== Sector-based bulk deletes ==========

interface SectorDeleteTarget {
  excludeSectors: string[];  // delete for all companies NOT in these sectors
  metrics: string[];
  reason: string;
}

const SECTOR_TARGETS: SectorDeleteTarget[] = [
  // medical_claims_expense: alias overlap (PolicyholderBenefitsAndClaimsIncurredNet
  // is in both losses_incurred and medical_claims_expense). Only meaningful for Health.
  {
    excludeSectors: ["Health"],
    metrics: ["medical_claims_expense"],
    reason: "Tag alias overlap — PolicyholderBenefitsAndClaimsIncurredNet mapped to both losses_incurred and medical_claims_expense",
  },
];

async function main() {
  console.log("=".repeat(80));
  console.log("  INSURINTEL OUTLIER CLEANUP");
  console.log("=".repeat(80));

  // Get company IDs and sectors
  const { data: companies } = await supabase.from("companies").select("id, ticker, sector");
  if (!companies) { console.error("Failed to fetch companies"); process.exit(1); }

  const tickerToId = new Map(companies.map(c => [c.ticker, c.id]));
  let totalDeleted = 0;

  // ===== Per-ticker targeted deletes =====
  console.log("\n  ── PER-TICKER TARGETED DELETES ──");

  for (const target of TARGETS) {
    const companyId = tickerToId.get(target.ticker);
    if (!companyId) {
      console.log(`\n  SKIP: ${target.ticker} not found in database`);
      continue;
    }

    console.log(`\n  ${target.ticker}: ${target.reason}`);

    for (const metric of target.metrics) {
      for (const year of target.years) {
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

  // ===== Sector-based bulk deletes =====
  console.log("\n\n  ── SECTOR-BASED BULK DELETES ──");

  for (const target of SECTOR_TARGETS) {
    console.log(`\n  ${target.metrics.join(", ")}: ${target.reason}`);

    // Get companies NOT in the excluded sectors
    const affectedCompanies = companies.filter(c => !target.excludeSectors.includes(c.sector));
    const affectedIds = affectedCompanies.map(c => c.id);

    for (const metric of target.metrics) {
      // Count existing rows first
      const { count } = await supabase
        .from("financial_metrics")
        .select("id", { count: "exact", head: true })
        .in("company_id", affectedIds)
        .eq("metric_name", metric)
        .eq("period_type", "annual");

      if (!count || count === 0) {
        console.log(`    ${metric}: already absent for non-${target.excludeSectors.join("/")} companies`);
        continue;
      }

      const { error } = await supabase
        .from("financial_metrics")
        .delete()
        .in("company_id", affectedIds)
        .eq("metric_name", metric)
        .eq("period_type", "annual");

      if (error) {
        console.error(`    ${metric}: DELETE FAILED — ${error.message}`);
      } else {
        console.log(`    ${metric}: DELETED ${count} rows from ${affectedCompanies.length} non-Health companies`);
        totalDeleted += count;
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
