/**
 * Investigate derived metric mismatches for CB, TRV, PGR.
 *
 * Run with:
 *   npx tsx scripts/investigate-metrics.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const TICKERS = ["CB", "TRV", "PGR"];
const METRICS_OF_INTEREST = [
  "losses_incurred",
  "net_premiums_earned",
  "net_income",
  "stockholders_equity",
  "loss_ratio",
  "roe",
  "expense_ratio",
  "combined_ratio",
  "roa",
  "book_value_per_share",
  "debt_to_equity",
  "acquisition_costs",
  "underwriting_expenses",
];

async function main() {
  // Get company IDs
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, ticker, name, sector")
    .in("ticker", TICKERS);

  if (compErr || !companies) {
    console.error("Failed to fetch companies:", compErr?.message);
    return;
  }

  console.log("=".repeat(120));
  console.log("COMPANIES FOUND:");
  console.log("=".repeat(120));
  for (const c of companies) {
    console.log(`  ${c.ticker} (${c.name}) - ID: ${c.id}, Sector: ${c.sector}`);
  }

  for (const company of companies) {
    console.log("\n" + "=".repeat(120));
    console.log(`COMPANY: ${company.ticker} (${company.name})`);
    console.log("=".repeat(120));

    // ---- PART 1: mv_latest_metrics ----
    console.log("\n--- mv_latest_metrics (latest annual per metric_name) ---");
    const { data: mvData, error: mvErr } = await supabase
      .from("mv_latest_metrics")
      .select("*")
      .eq("company_id", company.id)
      .in("metric_name", METRICS_OF_INTEREST)
      .order("metric_name");

    if (mvErr) {
      console.error("  Error querying mv_latest_metrics:", mvErr.message);
      continue;
    }

    if (mvData) {
      console.log(
        `  ${"metric_name".padEnd(25)} ${"fiscal_year".padEnd(12)} ${"metric_value".padEnd(25)} unit`
      );
      console.log("  " + "-".repeat(80));
      for (const row of mvData) {
        console.log(
          `  ${String(row.metric_name).padEnd(25)} ${String(row.fiscal_year).padEnd(12)} ${String(row.metric_value).padEnd(25)} ${row.unit}`
        );
      }
    }

    // ---- PART 2: financial_metrics for FY 2023 and 2024 ----
    console.log("\n--- financial_metrics (raw table, annual, FY 2023 & 2024) ---");
    const { data: fmData, error: fmErr } = await supabase
      .from("financial_metrics")
      .select("*")
      .eq("company_id", company.id)
      .eq("period_type", "annual")
      .in("fiscal_year", [2023, 2024])
      .in("metric_name", METRICS_OF_INTEREST)
      .order("fiscal_year", { ascending: true })
      .order("metric_name", { ascending: true });

    if (fmErr) {
      console.error("  Error querying financial_metrics:", fmErr.message);
      continue;
    }

    if (fmData) {
      console.log(
        `  ${"metric_name".padEnd(25)} ${"FY".padEnd(6)} ${"metric_value".padEnd(25)} ${"unit".padEnd(10)} ${"is_derived".padEnd(12)} ${"source".padEnd(10)} accession_number`
      );
      console.log("  " + "-".repeat(115));
      for (const row of fmData) {
        console.log(
          `  ${String(row.metric_name).padEnd(25)} ${String(row.fiscal_year).padEnd(6)} ${String(row.metric_value).padEnd(25)} ${String(row.unit).padEnd(10)} ${String(row.is_derived).padEnd(12)} ${String(row.source).padEnd(10)} ${row.accession_number ?? "null"}`
        );
      }
    }

    // ---- PART 3: Year-mismatch analysis ----
    console.log("\n--- YEAR MISMATCH ANALYSIS ---");

    if (mvData && fmData) {
      const mvByMetric: Record<string, { fiscal_year: number; metric_value: number }> = {};
      for (const row of mvData) {
        mvByMetric[row.metric_name] = { fiscal_year: row.fiscal_year, metric_value: Number(row.metric_value) };
      }

      // Loss Ratio analysis
      const mvLossRatio = mvByMetric["loss_ratio"];
      const mvLossesIncurred = mvByMetric["losses_incurred"];
      const mvNetPremiums = mvByMetric["net_premiums_earned"];

      console.log("\n  LOSS RATIO:");
      if (mvLossRatio) {
        console.log(`    mv_latest_metrics loss_ratio:          FY${mvLossRatio.fiscal_year}  value=${mvLossRatio.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics loss_ratio:          NOT PRESENT`);
      }
      if (mvLossesIncurred) {
        console.log(`    mv_latest_metrics losses_incurred:     FY${mvLossesIncurred.fiscal_year}  value=${mvLossesIncurred.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics losses_incurred:     NOT PRESENT`);
      }
      if (mvNetPremiums) {
        console.log(`    mv_latest_metrics net_premiums_earned: FY${mvNetPremiums.fiscal_year}  value=${mvNetPremiums.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics net_premiums_earned: NOT PRESENT`);
      }

      if (mvLossRatio && mvLossesIncurred && mvNetPremiums) {
        const yearMismatch =
          mvLossRatio.fiscal_year !== mvLossesIncurred.fiscal_year ||
          mvLossRatio.fiscal_year !== mvNetPremiums.fiscal_year;

        console.log(
          `    YEAR MISMATCH? ${yearMismatch ? "YES! loss_ratio FY" + mvLossRatio.fiscal_year + " vs losses_incurred FY" + mvLossesIncurred.fiscal_year + " vs net_premiums_earned FY" + mvNetPremiums.fiscal_year : "No - all same year"}`
        );

        // Recompute from the inputs shown in mv_latest_metrics
        const recomputedFromMV = (mvLossesIncurred.metric_value / mvNetPremiums.metric_value) * 100;
        console.log(`    Stored loss_ratio:                    ${mvLossRatio.metric_value}`);
        console.log(`    Recomputed from MV inputs:            ${recomputedFromMV.toFixed(10)}`);
        console.log(`    Match? ${Math.abs(mvLossRatio.metric_value - recomputedFromMV) < 0.001 ? "YES" : "NO - MISMATCH of " + (mvLossRatio.metric_value - recomputedFromMV).toFixed(10)}`);

        // Also try recomputing from same-year raw data
        if (mvLossRatio.fiscal_year !== mvLossesIncurred.fiscal_year || mvLossRatio.fiscal_year !== mvNetPremiums.fiscal_year) {
          // Find the raw data for the loss_ratio's own year
          const lossRatioYear = mvLossRatio.fiscal_year;
          const rawLossesForLRYear = fmData.find(r => r.metric_name === "losses_incurred" && r.fiscal_year === lossRatioYear);
          const rawPremiumsForLRYear = fmData.find(r => r.metric_name === "net_premiums_earned" && r.fiscal_year === lossRatioYear);

          if (rawLossesForLRYear && rawPremiumsForLRYear) {
            const recomputedSameYear = (Number(rawLossesForLRYear.metric_value) / Number(rawPremiumsForLRYear.metric_value)) * 100;
            console.log(`    Recomputed from FY${lossRatioYear} raw data:     ${recomputedSameYear.toFixed(10)}`);
            console.log(`    Match with stored? ${Math.abs(mvLossRatio.metric_value - recomputedSameYear) < 0.001 ? "YES - derived was computed from same-year inputs" : "NO - " + (mvLossRatio.metric_value - recomputedSameYear).toFixed(10)}`);
          } else {
            console.log(`    Cannot recompute from FY${lossRatioYear}: losses=${rawLossesForLRYear ? "found" : "MISSING"}, premiums=${rawPremiumsForLRYear ? "found" : "MISSING"}`);
          }
        }
      }

      // ROE analysis
      const mvRoe = mvByMetric["roe"];
      const mvNetIncome = mvByMetric["net_income"];
      const mvEquity = mvByMetric["stockholders_equity"];

      console.log("\n  ROE:");
      if (mvRoe) {
        console.log(`    mv_latest_metrics roe:                 FY${mvRoe.fiscal_year}  value=${mvRoe.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics roe:                 NOT PRESENT`);
      }
      if (mvNetIncome) {
        console.log(`    mv_latest_metrics net_income:           FY${mvNetIncome.fiscal_year}  value=${mvNetIncome.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics net_income:           NOT PRESENT`);
      }
      if (mvEquity) {
        console.log(`    mv_latest_metrics stockholders_equity:  FY${mvEquity.fiscal_year}  value=${mvEquity.metric_value}`);
      } else {
        console.log(`    mv_latest_metrics stockholders_equity:  NOT PRESENT`);
      }

      if (mvRoe && mvNetIncome && mvEquity) {
        const yearMismatch =
          mvRoe.fiscal_year !== mvNetIncome.fiscal_year ||
          mvRoe.fiscal_year !== mvEquity.fiscal_year;

        console.log(
          `    YEAR MISMATCH? ${yearMismatch ? "YES! roe FY" + mvRoe.fiscal_year + " vs net_income FY" + mvNetIncome.fiscal_year + " vs equity FY" + mvEquity.fiscal_year : "No - all same year"}`
        );

        const recomputedFromMV = (mvNetIncome.metric_value / mvEquity.metric_value) * 100;
        console.log(`    Stored roe:                           ${mvRoe.metric_value}`);
        console.log(`    Recomputed from MV inputs:            ${recomputedFromMV.toFixed(10)}`);
        console.log(`    Match? ${Math.abs(mvRoe.metric_value - recomputedFromMV) < 0.001 ? "YES" : "NO - MISMATCH of " + (mvRoe.metric_value - recomputedFromMV).toFixed(10)}`);

        if (mvRoe.fiscal_year !== mvNetIncome.fiscal_year || mvRoe.fiscal_year !== mvEquity.fiscal_year) {
          const roeYear = mvRoe.fiscal_year;
          const rawIncomeForROEYear = fmData.find(r => r.metric_name === "net_income" && r.fiscal_year === roeYear);
          const rawEquityForROEYear = fmData.find(r => r.metric_name === "stockholders_equity" && r.fiscal_year === roeYear);

          if (rawIncomeForROEYear && rawEquityForROEYear) {
            const recomputedSameYear = (Number(rawIncomeForROEYear.metric_value) / Number(rawEquityForROEYear.metric_value)) * 100;
            console.log(`    Recomputed from FY${roeYear} raw data:     ${recomputedSameYear.toFixed(10)}`);
            console.log(`    Match with stored? ${Math.abs(mvRoe.metric_value - recomputedSameYear) < 0.001 ? "YES" : "NO - " + (mvRoe.metric_value - recomputedSameYear).toFixed(10)}`);
          } else {
            console.log(`    Cannot recompute from FY${roeYear}: income=${rawIncomeForROEYear ? "found" : "MISSING"}, equity=${rawEquityForROEYear ? "found" : "MISSING"}`);
          }
        }
      }
    }

    // ---- PART 4: Check for duplicate entries ----
    console.log("\n--- DUPLICATE CHECK (same company_id, metric_name, period_type=annual, fiscal_year) ---");
    // We can't do a GROUP BY via PostgREST, so we'll check via raw SQL or just count by filtering
    for (const metricName of METRICS_OF_INTEREST) {
      for (const fy of [2023, 2024]) {
        const { data: dupes, error: dupeErr } = await supabase
          .from("financial_metrics")
          .select("id, metric_value, fiscal_quarter, accession_number, filed_at, created_at")
          .eq("company_id", company.id)
          .eq("metric_name", metricName)
          .eq("period_type", "annual")
          .eq("fiscal_year", fy);

        if (dupeErr) continue;
        if (dupes && dupes.length > 1) {
          console.log(`  DUPLICATE: ${metricName} FY${fy} has ${dupes.length} rows:`);
          for (const d of dupes) {
            console.log(`    id=${d.id} value=${d.metric_value} fq=${d.fiscal_quarter} accn=${d.accession_number} filed=${d.filed_at} created=${d.created_at}`);
          }
        }
      }
    }

    // ---- PART 5: Check all fiscal years available for key metrics ----
    console.log("\n--- ALL FISCAL YEARS AVAILABLE (annual) FOR KEY METRICS ---");
    for (const metricName of ["losses_incurred", "net_premiums_earned", "loss_ratio", "net_income", "stockholders_equity", "roe"]) {
      const { data: allYears } = await supabase
        .from("financial_metrics")
        .select("fiscal_year, metric_value, fiscal_quarter")
        .eq("company_id", company.id)
        .eq("metric_name", metricName)
        .eq("period_type", "annual")
        .order("fiscal_year", { ascending: false });

      if (allYears && allYears.length > 0) {
        const yearStr = allYears.map(r => `FY${r.fiscal_year}=${r.metric_value} (fq=${r.fiscal_quarter})`).join(", ");
        console.log(`  ${metricName.padEnd(25)}: ${yearStr}`);
      } else {
        console.log(`  ${metricName.padEnd(25)}: NO DATA`);
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log("INVESTIGATION COMPLETE");
  console.log("=".repeat(120));
}

main().catch(console.error);
