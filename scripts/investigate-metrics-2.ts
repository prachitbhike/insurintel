/**
 * Deep investigation: reverse-engineer what raw values produced
 * the stored derived metrics, and check if EDGAR 10-K data might
 * have had different raw values at seed time vs what's stored now.
 *
 * Run with:
 *   npx tsx scripts/investigate-metrics-2.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const TICKERS = ["CB", "TRV", "PGR"];

async function main() {
  const { data: companies } = await supabase
    .from("companies")
    .select("id, ticker, name, sector")
    .in("ticker", TICKERS);

  if (!companies) return;

  for (const company of companies) {
    console.log("\n" + "=".repeat(120));
    console.log(`${company.ticker} (${company.name})`);
    console.log("=".repeat(120));

    // Get ALL annual metrics for 2024 from financial_metrics
    const { data: allFY2024 } = await supabase
      .from("financial_metrics")
      .select("metric_name, metric_value, is_derived, accession_number, filed_at")
      .eq("company_id", company.id)
      .eq("period_type", "annual")
      .eq("fiscal_year", 2024)
      .order("metric_name");

    if (!allFY2024) continue;

    console.log("\nAll FY2024 annual metrics in financial_metrics:");
    console.log(`  ${"metric_name".padEnd(25)} ${"metric_value".padEnd(25)} ${"is_derived".padEnd(12)} ${"accession".padEnd(30)} filed_at`);
    console.log("  " + "-".repeat(110));
    for (const r of allFY2024) {
      console.log(
        `  ${String(r.metric_name).padEnd(25)} ${String(r.metric_value).padEnd(25)} ${String(r.is_derived).padEnd(12)} ${String(r.accession_number ?? "null").padEnd(30)} ${r.filed_at}`
      );
    }

    // Extract key values
    const val = (name: string) => {
      const row = allFY2024.find(r => r.metric_name === name);
      return row ? Number(row.metric_value) : null;
    };

    const lossesIncurred = val("losses_incurred");
    const netPremiumsEarned = val("net_premiums_earned");
    const netIncome = val("net_income");
    const equity = val("stockholders_equity");
    const storedLossRatio = val("loss_ratio");
    const storedROE = val("roe");

    console.log("\n--- LOSS RATIO REVERSE ENGINEERING ---");
    if (storedLossRatio != null && netPremiumsEarned != null) {
      // stored loss_ratio = (X / net_premiums_earned) * 100
      // So X = storedLossRatio / 100 * net_premiums_earned
      const impliedLosses = (storedLossRatio / 100) * netPremiumsEarned;
      console.log(`  Stored loss_ratio:           ${storedLossRatio}`);
      console.log(`  Current losses_incurred:     ${lossesIncurred}`);
      console.log(`  Current net_premiums_earned: ${netPremiumsEarned}`);
      console.log(`  Recomputed from current:     ${lossesIncurred != null ? (lossesIncurred / netPremiumsEarned) * 100 : "N/A"}`);
      console.log(`  Implied losses from stored:  ${impliedLosses}`);
      console.log(`  Difference (implied - current): ${lossesIncurred != null ? impliedLosses - lossesIncurred : "N/A"}`);
    }

    // Also check: maybe the derived was computed from prior-year losses/premiums
    console.log("\n  Cross-year check:");
    const { data: priorYearData } = await supabase
      .from("financial_metrics")
      .select("metric_name, metric_value, fiscal_year")
      .eq("company_id", company.id)
      .eq("period_type", "annual")
      .in("metric_name", ["losses_incurred", "net_premiums_earned", "net_income", "stockholders_equity"])
      .order("fiscal_year", { ascending: false });

    if (priorYearData) {
      for (const r of priorYearData) {
        console.log(`    ${r.metric_name} FY${r.fiscal_year} = ${r.metric_value}`);
      }

      // Try computing loss_ratio with every available combination
      const allLosses = priorYearData.filter(r => r.metric_name === "losses_incurred");
      const allPremiums = priorYearData.filter(r => r.metric_name === "net_premiums_earned");

      console.log("\n  All possible loss_ratio computations:");
      for (const loss of allLosses) {
        for (const prem of allPremiums) {
          const lr = (Number(loss.metric_value) / Number(prem.metric_value)) * 100;
          const matches = storedLossRatio != null && Math.abs(lr - storedLossRatio) < 0.001;
          console.log(
            `    losses FY${loss.fiscal_year} / premiums FY${prem.fiscal_year} = ${lr.toFixed(10)} ${matches ? "<<< MATCH!" : ""}`
          );
        }
      }
    }

    console.log("\n--- ROE REVERSE ENGINEERING ---");
    if (storedROE != null && equity != null) {
      const impliedIncome = (storedROE / 100) * equity;
      console.log(`  Stored roe:                  ${storedROE}`);
      console.log(`  Current net_income:          ${netIncome}`);
      console.log(`  Current stockholders_equity: ${equity}`);
      console.log(`  Recomputed from current:     ${netIncome != null ? (netIncome / equity) * 100 : "N/A"}`);
      console.log(`  Implied net_income:          ${impliedIncome}`);
      console.log(`  Difference (implied - current): ${netIncome != null ? impliedIncome - netIncome : "N/A"}`);

      // Try computing ROE with every available combination
      const allIncome = priorYearData?.filter(r => r.metric_name === "net_income") ?? [];
      const allEquity = priorYearData?.filter(r => r.metric_name === "stockholders_equity") ?? [];

      console.log("\n  All possible ROE computations:");
      for (const inc of allIncome) {
        for (const eq of allEquity) {
          const roe = (Number(inc.metric_value) / Number(eq.metric_value)) * 100;
          const matches = Math.abs(roe - storedROE) < 0.001;
          console.log(
            `    income FY${inc.fiscal_year} / equity FY${eq.fiscal_year} = ${roe.toFixed(10)} ${matches ? "<<< MATCH!" : ""}`
          );
        }
      }
    }

    // Check what the EDGAR API currently returns for this company
    // Specifically look at the 10-K filings for 2024
    console.log("\n--- CHECKING EDGAR XBRL DIRECTLY ---");
    const paddedCik = company.ticker === "CB" ? "0000896159" :
                      company.ticker === "TRV" ? "0000086312" :
                      "0000080661";
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "InsurIntel admin@insurintel.com",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.log(`  EDGAR returned ${res.status}`);
        continue;
      }

      const facts = await res.json() as { facts?: { "us-gaap"?: Record<string, { units: Record<string, Array<{ start?: string; end: string; val: number; accn: string; fy: number; fp: string; form: string; filed: string }>> }> } };
      const usGaap = facts?.facts?.["us-gaap"];
      if (!usGaap) {
        console.log("  No us-gaap data");
        continue;
      }

      // Check all aliases for losses_incurred
      const lossAliases = [
        "PolicyholderBenefitsAndClaimsIncurredNet",
        "IncurredClaimsPropertyCasualtyAndLiability",
        "LossesAndLossAdjustmentExpense",
      ];

      const premiumAliases = [
        "PremiumsEarnedNet",
        "NetPremiumsEarned",
        "PremiumsEarned",
      ];

      const incomeAliases = [
        "NetIncomeLoss",
        "ProfitLoss",
        "NetIncomeLossAvailableToCommonStockholdersBasic",
      ];

      const equityAliases = [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      ];

      function printEdgarValues(label: string, aliases: string[]) {
        console.log(`\n  ${label}:`);
        for (const alias of aliases) {
          const concept = usGaap![alias];
          if (!concept) {
            console.log(`    ${alias}: NOT FOUND`);
            continue;
          }
          const allUnits = Object.entries(concept.units);
          for (const [unitKey, entries] of allUnits) {
            const tenKs = entries.filter((e: any) => e.form === "10-K" && (e.fy === 2024 || e.fy === 2023));
            if (tenKs.length > 0) {
              console.log(`    ${alias} [${unitKey}] 10-K entries:`);
              for (const e of tenKs) {
                console.log(`      FY${e.fy} fp=${e.fp} val=${e.val} start=${e.start ?? "none"} end=${e.end} filed=${e.filed} accn=${e.accn}`);
              }
            }
          }
        }
      }

      printEdgarValues("LOSSES_INCURRED aliases", lossAliases);
      printEdgarValues("NET_PREMIUMS_EARNED aliases", premiumAliases);
      printEdgarValues("NET_INCOME aliases", incomeAliases);
      printEdgarValues("STOCKHOLDERS_EQUITY aliases", equityAliases);

      // KEY TEST: replicate the parseFacts dedup logic for losses_incurred
      console.log("\n  --- Simulating parseFacts dedup for losses_incurred ---");
      for (const alias of lossAliases) {
        const concept = usGaap[alias];
        if (!concept) continue;
        const units = concept.units["USD"] ?? Object.values(concept.units)[0];
        if (!units || units.length === 0) continue;

        const minYear = new Date().getFullYear() - 5;
        const all = units.filter((u: any) => (u.form === "10-K" || u.form === "10-Q") && u.fy >= minYear);
        const tenK2024 = all.filter((u: any) => u.form === "10-K" && u.fy === 2024);

        console.log(`    ${alias}: ${tenK2024.length} 10-K entries for FY2024`);
        for (const e of tenK2024) {
          console.log(`      val=${e.val} start=${e.start ?? "none"} end=${e.end} fp=${e.fp} filed=${e.filed}`);
        }

        // The dedup key is: `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`
        // If there are multiple entries with different start/end but same fy|fp|form, they won't dedup!
        const dedupMap = new Map<string, any>();
        for (const entry of tenK2024) {
          const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
          const existing = dedupMap.get(key);
          if (!existing || entry.filed > existing.filed) {
            dedupMap.set(key, entry);
          }
        }
        console.log(`      After dedup: ${dedupMap.size} entries`);
        for (const [key, entry] of dedupMap) {
          console.log(`        key="${key}" val=${entry.val}`);
        }

        // But: the parseFacts function picks the FIRST alias that has data!
        console.log(`    >>> SELECTED THIS ALIAS (first with data)`);
        break;
      }

      // Same for net_premiums_earned
      console.log("\n  --- Simulating parseFacts dedup for net_premiums_earned ---");
      for (const alias of premiumAliases) {
        const concept = usGaap[alias];
        if (!concept) continue;
        const units = concept.units["USD"] ?? Object.values(concept.units)[0];
        if (!units || units.length === 0) continue;

        const tenK2024 = units.filter((u: any) => u.form === "10-K" && u.fy === 2024);
        console.log(`    ${alias}: ${tenK2024.length} 10-K entries for FY2024`);
        for (const e of tenK2024) {
          console.log(`      val=${e.val} start=${e.start ?? "none"} end=${e.end} fp=${e.fp} filed=${e.filed}`);
        }

        const dedupMap = new Map<string, any>();
        for (const entry of tenK2024) {
          const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
          const existing = dedupMap.get(key);
          if (!existing || entry.filed > existing.filed) {
            dedupMap.set(key, entry);
          }
        }
        console.log(`      After dedup: ${dedupMap.size} entries`);
        for (const [key, entry] of dedupMap) {
          console.log(`        key="${key}" val=${entry.val}`);
        }
        console.log(`    >>> SELECTED THIS ALIAS (first with data)`);
        break;
      }

      // Same for net_income
      console.log("\n  --- Simulating parseFacts dedup for net_income ---");
      for (const alias of incomeAliases) {
        const concept = usGaap[alias];
        if (!concept) continue;
        const units = concept.units["USD"] ?? Object.values(concept.units)[0];
        if (!units || units.length === 0) continue;

        const tenK2024 = units.filter((u: any) => u.form === "10-K" && u.fy === 2024);
        console.log(`    ${alias}: ${tenK2024.length} 10-K entries for FY2024`);
        for (const e of tenK2024) {
          console.log(`      val=${e.val} start=${e.start ?? "none"} end=${e.end} fp=${e.fp} filed=${e.filed}`);
        }

        const dedupMap = new Map<string, any>();
        for (const entry of tenK2024) {
          const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
          const existing = dedupMap.get(key);
          if (!existing || entry.filed > existing.filed) {
            dedupMap.set(key, entry);
          }
        }
        console.log(`      After dedup: ${dedupMap.size} entries`);
        for (const [key, entry] of dedupMap) {
          console.log(`        key="${key}" val=${entry.val}`);
        }
        console.log(`    >>> SELECTED THIS ALIAS (first with data)`);
        break;
      }

      // Same for stockholders_equity
      console.log("\n  --- Simulating parseFacts dedup for stockholders_equity ---");
      for (const alias of equityAliases) {
        const concept = usGaap[alias];
        if (!concept) continue;
        const units = concept.units["USD"] ?? Object.values(concept.units)[0];
        if (!units || units.length === 0) continue;

        const tenK2024 = units.filter((u: any) => u.form === "10-K" && u.fy === 2024);
        console.log(`    ${alias}: ${tenK2024.length} 10-K entries for FY2024`);
        for (const e of tenK2024) {
          console.log(`      val=${e.val} start=${e.start ?? "none"} end=${e.end} fp=${e.fp} filed=${e.filed}`);
        }

        const dedupMap = new Map<string, any>();
        for (const entry of tenK2024) {
          const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
          const existing = dedupMap.get(key);
          if (!existing || entry.filed > existing.filed) {
            dedupMap.set(key, entry);
          }
        }
        console.log(`      After dedup: ${dedupMap.size} entries`);
        for (const [key, entry] of dedupMap) {
          console.log(`        key="${key}" val=${entry.val}`);
        }
        console.log(`    >>> SELECTED THIS ALIAS (first with data)`);
        break;
      }

    } catch (err) {
      console.log(`  EDGAR fetch error: ${err}`);
    }

    // Add a delay between companies to respect rate limit
    await new Promise(r => setTimeout(r, 200));
  }
}

main().catch(console.error);
