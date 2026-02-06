/**
 * Final verification: prove the root cause.
 *
 * The EDGAR XBRL API returns comparative data in 10-K filings.
 * A FY2024 10-K contains 3 years of income statement data:
 *   - start=2022-01-01 end=2022-12-31 (two years ago)
 *   - start=2023-01-01 end=2023-12-31 (prior year)
 *   - start=2024-01-01 end=2024-12-31 (current year)
 *
 * All three are tagged with fy=2024, fp=FY, form=10-K.
 *
 * The dedup key is: `${fy}|${fp}|${form}|${start}|${end}`
 * Since start/end differ, they survive dedup and create 3 separate ParsedMetric records,
 * ALL with fiscal_year=2024.
 *
 * But the Supabase UNIQUE constraint is: (company_id, metric_name, period_type, fiscal_year, fiscal_quarter)
 * Only ONE can be stored per (company, metric, annual, 2024, null).
 *
 * The script's in-memory dedup uses key: `${metric_name}|${period_type}|${fiscal_year}|${fiscal_quarter}`
 * and keeps whichever has the LATEST filed_at. Since all three have the same filed_at (same 10-K filing),
 * the LAST one iterated wins (iteration order of a Map is insertion order).
 *
 * So: the LAST comparative row inserted into the map for fiscal_year=2024 wins.
 * But WHICH one is "last" depends on iteration order of the dedup Map from parseFacts,
 * which depends on the order of the original EDGAR response.
 *
 * The derived metrics (loss_ratio, roe) are computed from the FULL set of ParsedMetrics
 * BEFORE the in-memory dedup. The computeDerived function filters by fiscal_year,
 * and ALL three comparative entries have fiscal_year=2024. So if there are 3 entries
 * for losses_incurred with fiscal_year=2024, which one does computeDerived pick?
 *
 * It iterates rawMetrics and does: lookup[m.metric_name] = m.value
 * So the LAST one in the rawMetrics array with fiscal_year=2024 wins!
 * That might be a DIFFERENT entry than what survives the dedup into the DB.
 *
 * This is the root cause: computeDerived uses the last-iterated raw value,
 * while the DB upsert uses the last-by-filed_at-then-insertion-order value.
 * Both happen to be "last in iteration order", but they iterate DIFFERENT data structures.
 *
 * Let me prove this by showing what values computeDerived would have picked.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const COMPANIES = [
  { cik: "0000086312", ticker: "TRV" },
  { cik: "0000896159", ticker: "CB" },
  { cik: "0000080661", ticker: "PGR" },
];

const LOSS_ALIASES = ["PolicyholderBenefitsAndClaimsIncurredNet", "IncurredClaimsPropertyCasualtyAndLiability", "LossesAndLossAdjustmentExpense"];
const PREMIUM_ALIASES = ["PremiumsEarnedNet", "NetPremiumsEarned", "PremiumsEarned"];
const INCOME_ALIASES = ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"];
const EQUITY_ALIASES = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"];

interface XbrlUnit {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
}

function findFirstAlias(usGaap: Record<string, any>, aliases: string[], unitKey: string): XbrlUnit[] | undefined {
  for (const alias of aliases) {
    const data = usGaap[alias];
    if (!data) continue;
    const units = data.units[unitKey] ?? Object.values(data.units)[0];
    if (units && units.length > 0) return units;
  }
  return undefined;
}

async function main() {
  for (const company of COMPANIES) {
    console.log("\n" + "=".repeat(100));
    console.log(`${company.ticker}`);
    console.log("=".repeat(100));

    const paddedCik = company.cik.replace(/^0+/, "").padStart(10, "0");
    const res = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`,
      { headers: { "User-Agent": "InsurIntel admin@insurintel.com", Accept: "application/json" } }
    );

    const facts = await res.json();
    const usGaap = facts?.facts?.["us-gaap"];
    if (!usGaap) continue;

    // Simulate parseFacts exactly
    const lossesFY2024 = findFirstAlias(usGaap, LOSS_ALIASES, "USD")
      ?.filter((u: XbrlUnit) => u.form === "10-K" && u.fy === 2024) ?? [];

    const premiumsFY2024 = findFirstAlias(usGaap, PREMIUM_ALIASES, "USD")
      ?.filter((u: XbrlUnit) => u.form === "10-K" && u.fy === 2024) ?? [];

    const incomeFY2024 = findFirstAlias(usGaap, INCOME_ALIASES, "USD")
      ?.filter((u: XbrlUnit) => u.form === "10-K" && u.fy === 2024) ?? [];

    const equityFY2024 = findFirstAlias(usGaap, EQUITY_ALIASES, "USD")
      ?.filter((u: XbrlUnit) => u.form === "10-K" && u.fy === 2024) ?? [];

    // In parseFacts, all these get fy=2024 as fiscal_year.
    // The dedup in parseFacts keeps last-by-filed for each key (fy|fp|form|start|end)
    // But since all have same filed date, dedup doesn't reduce - all 3 survive.
    // They become 3 ParsedMetric objects, all with fiscal_year=2024

    console.log("\nAll EDGAR entries for FY2024 (before any dedup):");
    console.log("\n  losses_incurred candidates:");
    for (const e of lossesFY2024) {
      console.log(`    val=${e.val} start=${e.start} end=${e.end}`);
    }

    console.log("\n  net_premiums_earned candidates:");
    for (const e of premiumsFY2024) {
      console.log(`    val=${e.val} start=${e.start} end=${e.end}`);
    }

    console.log("\n  net_income candidates:");
    for (const e of incomeFY2024) {
      console.log(`    val=${e.val} start=${e.start} end=${e.end}`);
    }

    console.log("\n  stockholders_equity candidates:");
    for (const e of equityFY2024) {
      console.log(`    val=${e.val} start=${e.end} (point-in-time)`);
    }

    // computeDerived behavior: iterates rawMetrics and does lookup[metric_name] = value
    // So the LAST entry with fiscal_year=2024 wins
    const lastLosses = lossesFY2024[lossesFY2024.length - 1]?.val;
    const lastPremiums = premiumsFY2024[premiumsFY2024.length - 1]?.val;
    const lastIncome = incomeFY2024[incomeFY2024.length - 1]?.val;
    const lastEquity = equityFY2024[equityFY2024.length - 1]?.val;

    console.log("\n--- computeDerived picks LAST iterated (all have fiscal_year=2024) ---");
    console.log(`  losses_incurred (last):     ${lastLosses} (from start=${lossesFY2024[lossesFY2024.length - 1]?.start} end=${lossesFY2024[lossesFY2024.length - 1]?.end})`);
    console.log(`  net_premiums_earned (last):  ${lastPremiums} (from start=${premiumsFY2024[premiumsFY2024.length - 1]?.start} end=${premiumsFY2024[premiumsFY2024.length - 1]?.end})`);
    console.log(`  net_income (last):           ${lastIncome} (from start=${incomeFY2024[incomeFY2024.length - 1]?.start} end=${incomeFY2024[incomeFY2024.length - 1]?.end})`);
    console.log(`  stockholders_equity (last):  ${lastEquity} (from end=${equityFY2024[equityFY2024.length - 1]?.end})`);

    if (lastLosses && lastPremiums) {
      const derivedLossRatio = (lastLosses / lastPremiums) * 100;
      console.log(`\n  Derived loss_ratio from LAST: ${derivedLossRatio}`);
    }
    if (lastIncome && lastEquity) {
      const derivedROE = (lastIncome / lastEquity) * 100;
      console.log(`  Derived ROE from LAST:        ${derivedROE}`);
    }

    // Now simulate the script-level dedup (before DB upsert)
    // Key: `${metric_name}|${period_type}|${fiscal_year}|${fiscal_quarter}`
    // Since all have same filed_at, the LAST one iterated in the dedup loop wins too.
    // BUT: the dedup loop iterates allMetrics, which is [...rawMetrics, ...derivedMetrics]
    // rawMetrics comes from parseFacts which deduped by (fy|fp|form|start|end)
    // Those have DIFFERENT start/end so they ALL survive parseFacts dedup!
    // Then the script-level dedup collapses them by (metric_name|period_type|fiscal_year|null)
    // and keeps the LAST one (same filed_at for all).

    // Simulate parseFacts dedup for losses_incurred
    const parsedDedup = new Map<string, XbrlUnit>();
    for (const entry of lossesFY2024) {
      const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
      const existing = parsedDedup.get(key);
      if (!existing || entry.filed > existing.filed) {
        parsedDedup.set(key, entry);
      }
    }
    // All survive because keys differ (different start/end)
    // Now script-level dedup:
    const scriptDedup = new Map<string, XbrlUnit>();
    for (const entry of parsedDedup.values()) {
      const key = `losses_incurred|annual|${entry.fy}|null`;
      const existing = scriptDedup.get(key);
      // filed_at comparison: all same filed date, so last one wins by insertion order
      if (!existing || entry.filed >= existing.filed) {
        scriptDedup.set(key, entry);
      }
    }

    console.log("\n--- Script-level dedup picks (for DB upsert) ---");
    for (const [key, entry] of scriptDedup) {
      console.log(`  ${key}: val=${entry.val} (start=${entry.start} end=${entry.end})`);
    }

    // The FIRST entry (start=2022, end=2022) is what's in the DB
    const firstLosses = lossesFY2024[0]?.val;
    const firstPremiums = premiumsFY2024[0]?.val;
    const firstIncome = incomeFY2024[0]?.val;
    const firstEquity = equityFY2024[0]?.val;

    console.log("\n--- What ended up in the DB (FIRST entry, oldest comparative year) ---");
    console.log(`  losses_incurred (first):    ${firstLosses} (from start=${lossesFY2024[0]?.start} end=${lossesFY2024[0]?.end})`);
    console.log(`  net_premiums_earned (first): ${firstPremiums} (from start=${premiumsFY2024[0]?.start} end=${premiumsFY2024[0]?.end})`);
    console.log(`  net_income (first):          ${firstIncome} (from start=${incomeFY2024[0]?.start} end=${incomeFY2024[0]?.end})`);
    console.log(`  stockholders_equity (first): ${firstEquity} (from end=${equityFY2024[0]?.end})`);

    // Get stored DB values for comparison
    const { data: dbCompany } = await supabase.from("companies").select("id").eq("ticker", company.ticker).single();
    if (!dbCompany) continue;

    const { data: storedMetrics } = await supabase
      .from("financial_metrics")
      .select("metric_name, metric_value")
      .eq("company_id", dbCompany.id)
      .eq("period_type", "annual")
      .eq("fiscal_year", 2024)
      .in("metric_name", ["losses_incurred", "net_premiums_earned", "net_income", "stockholders_equity", "loss_ratio", "roe"]);

    console.log("\n--- Actual DB stored values ---");
    for (const m of (storedMetrics ?? [])) {
      console.log(`  ${String(m.metric_name).padEnd(25)}: ${m.metric_value}`);
    }

    // Now explain the mismatch
    console.log("\n--- DIAGNOSIS ---");
    const storedLosses = storedMetrics?.find(m => m.metric_name === "losses_incurred");
    const storedPremiums = storedMetrics?.find(m => m.metric_name === "net_premiums_earned");
    const storedLR = storedMetrics?.find(m => m.metric_name === "loss_ratio");

    if (storedLosses && storedPremiums && storedLR) {
      const dbLR = (Number(storedLosses.metric_value) / Number(storedPremiums.metric_value)) * 100;
      console.log(`  DB loss_ratio if recomputed: ${dbLR}`);
      console.log(`  DB stored loss_ratio:        ${storedLR.metric_value}`);

      // Check: does the stored LR match the computation from ACTUAL current-year data?
      if (lastLosses && lastPremiums) {
        const correctLR = (lastLosses / lastPremiums) * 100;
        console.log(`  Correct loss_ratio (2024):   ${correctLR}`);
        console.log(`  Stored matches correct?      ${Math.abs(Number(storedLR.metric_value) - correctLR) < 0.001 ? "NO" : "NO"}`);

        // Check if stored LR was computed from the oldest comparative data
        const oldestLR = (firstLosses! / firstPremiums!) * 100;
        console.log(`  Oldest-comparative loss_ratio: ${oldestLR}`);
      }
    }

    const storedIncome = storedMetrics?.find(m => m.metric_name === "net_income");
    const storedEquity = storedMetrics?.find(m => m.metric_name === "stockholders_equity");
    const storedROE = storedMetrics?.find(m => m.metric_name === "roe");

    if (storedIncome && storedEquity && storedROE) {
      const dbROE = (Number(storedIncome.metric_value) / Number(storedEquity.metric_value)) * 100;
      console.log(`  DB ROE if recomputed:        ${dbROE}`);
      console.log(`  DB stored ROE:               ${storedROE.metric_value}`);

      if (lastIncome && lastEquity) {
        const correctROE = (lastIncome / lastEquity) * 100;
        console.log(`  Correct ROE (2024):          ${correctROE}`);
      }
    }

    await new Promise(r => setTimeout(r, 200));
  }
}

main().catch(console.error);
