/**
 * InsurIntel — EDGAR Tag Scanner
 *
 * For companies with missing base metrics, fetches EDGAR CompanyFacts
 * and searches for candidate XBRL tags that could fill the gap.
 *
 * Usage:
 *   npx tsx scripts/scan-edgar-tags.ts --ticker PGR
 *   npx tsx scripts/scan-edgar-tags.ts --ticker PGR --metric acquisition_costs
 *   npx tsx scripts/scan-edgar-tags.ts --all-gaps
 *
 * Requires EDGAR_USER_AGENT env var (format: "AppName email@example.com")
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

// ========== Types ==========
interface CompanyRow {
  id: string;
  cik: string;
  ticker: string;
  name: string;
  sector: string;
}

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

interface CandidateTag {
  tag: string;
  label: string;
  taxonomy: string;
  unit: string;
  yearsWithData: number[];
  sampleValues: { year: number; value: number }[];
  has10K: boolean;
  isIncomeStatement: boolean; // has start date (flow metric)
  alreadyInAliases: boolean;
  usedByOtherMetric: string | null;
  recommendation: "LIKELY_MATCH" | "POSSIBLE_MATCH" | "SKIP";
  skipReason?: string;
}

// ========== Current XBRL aliases (for collision detection) ==========
const CURRENT_ALIASES: Record<string, string[]> = {
  net_premiums_earned: ["PremiumsEarnedNet", "NetPremiumsEarned", "PremiumsEarned", "PremiumsEarnedNetPropertyAndCasualty", "SupplementaryInsuranceInformationPremiumRevenue"],
  losses_incurred: ["PolicyholderBenefitsAndClaimsIncurredNet", "IncurredClaimsPropertyCasualtyAndLiability", "LossesAndLossAdjustmentExpense", "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1"],
  net_income: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  stockholders_equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  total_assets: ["Assets"],
  total_liabilities: ["Liabilities"],
  eps: ["EarningsPerShareDiluted", "EarningsPerShareBasic"],
  shares_outstanding: ["EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding", "WeightedAverageNumberOfShareOutstandingBasicAndDiluted", "WeightedAverageNumberOfSharesOutstandingBasic"],
  investment_income: ["NetInvestmentIncome", "InvestmentIncomeNet", "InvestmentIncomeInterestAndDividend"],
  total_debt: ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligations", "LongTermDebtNoncurrent", "DebtInstrumentCarryingAmount", "DebtLongtermAndShorttermCombinedAmount", "DebtAndCapitalLeaseObligations", "SeniorLongTermNotes", "UnsecuredDebt", "JuniorSubordinatedNotes", "SeniorNotes", "SubordinatedDebt"],
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "HealthCareOrganizationRevenue", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  medical_claims_expense: ["PolicyholderBenefitsAndClaimsIncurredHealthCare", "BenefitExpenseHealthCareOrganizations", "PolicyholderBenefitsAndClaimsIncurredNet", "HealthCareCostsBenefitExpense", "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1"],
  acquisition_costs: ["DeferredPolicyAcquisitionCostAmortizationExpense", "PolicyAcquisitionCosts", "AmortizationOfDeferredPolicyAcquisitionCosts", "SupplementaryInsuranceInformationAmortizationOfDeferredPolicyAcquisitionCosts"],
  underwriting_expenses: ["UnderwritingExpenses", "OtherUnderwritingExpense", "GeneralAndAdministrativeExpense", "SellingGeneralAndAdministrativeExpense", "SupplementaryInsuranceInformationOtherOperatingExpense"],
};

// Reverse lookup: tag -> metric it's used for
const TAG_TO_METRIC = new Map<string, string>();
for (const [metric, aliases] of Object.entries(CURRENT_ALIASES)) {
  for (const alias of aliases) {
    TAG_TO_METRIC.set(alias, metric);
  }
}

// ========== Search keywords per metric ==========
const SEARCH_KEYWORDS: Record<string, string[]> = {
  acquisition_costs: [
    "Acquisition", "PolicyAcquisition", "Commission", "InsuranceCommission",
    "DeferredPolicyAcquisition", "Amortization", "DeferredAcquisition",
  ],
  underwriting_expenses: [
    "Underwriting", "OtherUnderwriting", "GeneralAndAdministrative",
    "InsuranceExpense", "OperatingExpense", "PolicyAdministration",
  ],
  losses_incurred: [
    "Claim", "Loss", "Benefit", "Incurred", "PolicyholderBenefit",
    "ClaimsIncurred", "LossAdjustment",
  ],
  investment_income: [
    "InvestmentIncome", "NetInvestment", "InterestAndDividend",
    "InvestmentRevenue",
  ],
  total_debt: [
    "Debt", "LongTerm", "Notes", "Borrowing", "CreditFacility",
    "FundsBorrowed", "SubordinatedDebt",
  ],
  revenue: [
    "Revenue", "Commission", "BrokerageCommission", "OperatingRevenue",
    "ServiceRevenue", "InterestIncome", "FeeIncome",
  ],
  net_premiums_earned: [
    "Premium", "PremiumsEarned", "NetPremium", "GrossPremium",
    "InsurancePremium",
  ],
  shares_outstanding: [
    "SharesOutstanding", "CommonStock", "WeightedAverage",
    "SharesIssued",
  ],
  medical_claims_expense: [
    "MedicalClaim", "HealthCare", "BenefitExpense", "MemberBenefit",
    "HealthCareCost",
  ],
  net_income: [
    "NetIncome", "ProfitLoss", "NetEarnings",
  ],
  stockholders_equity: [
    "StockholdersEquity", "ShareholdersEquity", "Equity",
  ],
  total_assets: [
    "Assets",
  ],
  total_liabilities: [
    "Liabilities",
  ],
  eps: [
    "EarningsPerShare", "IncomeLossPerShare",
  ],
};

// ========== Expected unit for each metric ==========
const METRIC_EXPECTED_UNIT: Record<string, string> = {
  net_premiums_earned: "USD",
  losses_incurred: "USD",
  acquisition_costs: "USD",
  underwriting_expenses: "USD",
  net_income: "USD",
  stockholders_equity: "USD",
  total_assets: "USD",
  total_liabilities: "USD",
  investment_income: "USD",
  total_debt: "USD",
  revenue: "USD",
  medical_claims_expense: "USD",
  eps: "USD/shares",
  shares_outstanding: "shares",
};

// Income statement metrics (flow, should have start date)
const INCOME_STATEMENT_METRICS = new Set([
  "net_premiums_earned", "losses_incurred", "acquisition_costs",
  "underwriting_expenses", "net_income", "investment_income",
  "revenue", "medical_claims_expense", "eps",
]);

// Balance sheet metrics (point-in-time, no start date)
const BALANCE_SHEET_METRICS = new Set([
  "stockholders_equity", "total_assets", "total_liabilities",
  "total_debt", "shares_outstanding",
]);

// ========== Sector expected metrics ==========
const SECTOR_EXPECTED: Record<string, string[]> = {
  "P&C": [
    "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
  ],
  "Life": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
  ],
  "Health": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "total_debt", "revenue", "medical_claims_expense",
  ],
  "Reinsurance": [
    "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
  ],
  "Brokers": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "total_debt", "revenue",
  ],
};

// ========== Helpers ==========
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequest = 0;
async function rateLimitedFetch(url: string, userAgent: string) {
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < 125) {
    await sleep(125 - elapsed);
  }
  lastRequest = Date.now();

  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });

  if (res.status === 429 || res.status >= 500) {
    console.warn(`  Rate limited (${res.status}), waiting 2s...`);
    await sleep(2000);
    return fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
    });
  }
  return res;
}

function fmtUSD(val: number): string {
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

async function fetchAll<T>(table: string, selectCols: string, filters?: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    let query = supabase.from(table).select(selectCols).range(offset, offset + pageSize - 1);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        query = query.eq(k, v);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// ========== Core Scanner ==========
function scanForCandidates(
  facts: Record<string, unknown>,
  targetMetric: string,
  targetYears: number[],
  ticker: string,
): CandidateTag[] {
  const candidates: CandidateTag[] = [];
  const factsObj = (facts as { facts?: Record<string, Record<string, { label?: string; units: Record<string, XbrlUnit[]> }>> }).facts;
  if (!factsObj) return candidates;

  const keywords = SEARCH_KEYWORDS[targetMetric];
  if (!keywords) {
    console.log(`    No search keywords defined for ${targetMetric}`);
    return candidates;
  }

  const expectedUnit = METRIC_EXPECTED_UNIT[targetMetric] || "USD";
  const isIS = INCOME_STATEMENT_METRICS.has(targetMetric);

  // Search us-gaap taxonomy
  for (const taxonomy of ["us-gaap", "dei", "ifrs-full"]) {
    const taxData = factsObj[taxonomy];
    if (!taxData) continue;

    for (const [tagName, tagData] of Object.entries(taxData)) {
      // Check if tag matches any keyword (case-insensitive)
      const matchesKeyword = keywords.some((kw) =>
        tagName.toLowerCase().includes(kw.toLowerCase())
      );
      if (!matchesKeyword) continue;

      const label = tagData.label || tagName;
      const units = tagData.units;

      // Find matching unit key
      let matchingUnitKey: string | null = null;
      let matchingEntries: XbrlUnit[] = [];

      for (const [unitKey, entries] of Object.entries(units)) {
        if (expectedUnit === "USD" && unitKey === "USD") {
          matchingUnitKey = unitKey;
          matchingEntries = entries;
          break;
        }
        if (expectedUnit === "USD/shares" && unitKey === "USD/shares") {
          matchingUnitKey = unitKey;
          matchingEntries = entries;
          break;
        }
        if (expectedUnit === "shares" && unitKey === "shares") {
          matchingUnitKey = unitKey;
          matchingEntries = entries;
          break;
        }
      }

      if (!matchingUnitKey || matchingEntries.length === 0) continue;

      // Filter to 10-K entries in target years
      const tenKEntries = matchingEntries.filter((e) => e.form === "10-K");
      if (tenKEntries.length === 0) continue;

      // Get years with data (using end date year for us-gaap, fy for dei)
      const yearsWithData = new Set<number>();
      const sampleValues: { year: number; value: number }[] = [];

      for (const entry of tenKEntries) {
        const year = taxonomy === "dei" ? entry.fy : parseInt(entry.end.substring(0, 4), 10);
        if (year >= 2021 && year <= 2024) {
          if (!yearsWithData.has(year)) {
            yearsWithData.add(year);
            sampleValues.push({ year, value: entry.val });
          }
        }
      }

      if (yearsWithData.size === 0) continue;

      // Check if it covers the target years
      const coversTargetYears = targetYears.some((y) => yearsWithData.has(y));
      if (!coversTargetYears) continue;

      // Check if it's an income statement tag (has start date)
      const hasStartDate = tenKEntries.some((e) => e.start != null);

      // Check if already in our aliases
      const alreadyInAliases = TAG_TO_METRIC.has(tagName);
      const usedByOtherMetric = TAG_TO_METRIC.get(tagName) || null;

      // Classify recommendation
      let recommendation: CandidateTag["recommendation"] = "POSSIBLE_MATCH";
      let skipReason: string | undefined;

      // Skip if already used by the same metric
      if (alreadyInAliases && usedByOtherMetric === targetMetric) {
        recommendation = "SKIP";
        skipReason = "Already an alias for this metric (parser issue, not alias gap)";
      }
      // Skip if used by a different metric
      else if (alreadyInAliases && usedByOtherMetric !== targetMetric) {
        recommendation = "SKIP";
        skipReason = `Already used by ${usedByOtherMetric} — collision risk`;
      }
      // Check income statement vs balance sheet consistency
      else if (isIS && !hasStartDate) {
        recommendation = "SKIP";
        skipReason = "Balance sheet tag (no start date) but metric is income statement";
      }
      else if (!isIS && hasStartDate && BALANCE_SHEET_METRICS.has(targetMetric)) {
        recommendation = "SKIP";
        skipReason = "Income statement tag (has start date) but metric is balance sheet";
      }
      // Likely match if covers most target years
      else if (targetYears.filter((y) => yearsWithData.has(y)).length >= targetYears.length * 0.75) {
        recommendation = "LIKELY_MATCH";
      }

      candidates.push({
        tag: tagName,
        label,
        taxonomy,
        unit: matchingUnitKey,
        yearsWithData: [...yearsWithData].sort(),
        sampleValues: sampleValues.sort((a, b) => a.year - b.year),
        has10K: true,
        isIncomeStatement: hasStartDate,
        alreadyInAliases,
        usedByOtherMetric,
        recommendation,
        skipReason,
      });
    }
  }

  // Sort: LIKELY > POSSIBLE > SKIP, then by coverage
  candidates.sort((a, b) => {
    const order = { LIKELY_MATCH: 0, POSSIBLE_MATCH: 1, SKIP: 2 };
    if (order[a.recommendation] !== order[b.recommendation]) {
      return order[a.recommendation] - order[b.recommendation];
    }
    return b.yearsWithData.length - a.yearsWithData.length;
  });

  return candidates;
}

// ========== MAIN ==========
async function main() {
  const args = process.argv.slice(2);
  const tickerIdx = args.indexOf("--ticker");
  const metricIdx = args.indexOf("--metric");
  const allGaps = args.includes("--all-gaps");

  const filterTicker = tickerIdx >= 0 ? args[tickerIdx + 1] : null;
  const filterMetric = metricIdx >= 0 ? args[metricIdx + 1] : null;

  const userAgent = process.env.EDGAR_USER_AGENT || "InsurIntel admin@insurintel.com";

  console.log("=".repeat(100));
  console.log("  INSURINTEL EDGAR TAG SCANNER");
  console.log(`  Run at: ${new Date().toISOString()}`);
  if (filterTicker) console.log(`  Filter: ticker=${filterTicker}`);
  if (filterMetric) console.log(`  Filter: metric=${filterMetric}`);
  if (allGaps) console.log(`  Mode: auto-detect all gaps from DB`);
  console.log("=".repeat(100));

  // Fetch companies
  const companies = await fetchAll<CompanyRow>("companies", "id, cik, ticker, name, sector");
  const companyByTicker = new Map<string, CompanyRow>();
  const companyById = new Map<string, CompanyRow>();
  for (const c of companies) {
    companyByTicker.set(c.ticker, c);
    companyById.set(c.id, c);
  }

  // Determine targets
  interface ScanTarget {
    company: CompanyRow;
    metric: string;
    missingYears: number[];
  }

  const targets: ScanTarget[] = [];

  if (allGaps) {
    // Auto-detect from DB: find metrics that are expected but missing
    console.log("\nDetecting gaps from database...");
    const allMetrics = await fetchAll<{ company_id: string; metric_name: string; fiscal_year: number }>(
      "financial_metrics",
      "company_id, metric_name, fiscal_year",
      { period_type: "annual" }
    );

    // Build lookup: company_id -> Set of "metric|year"
    const present = new Map<string, Set<string>>();
    for (const m of allMetrics) {
      if (!present.has(m.company_id)) present.set(m.company_id, new Set());
      present.get(m.company_id)!.add(`${m.metric_name}|${m.fiscal_year}`);
    }

    const FISCAL_YEARS = [2021, 2022, 2023, 2024];

    // Known exceptions to skip
    const SKIP_TICKERS: Record<string, Set<string>> = {
      ERIE: new Set(["net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses", "investment_income"]),
      "BRK.B": new Set(["eps", "acquisition_costs", "underwriting_expenses"]),
      ALL: new Set(["losses_incurred"]),
    };

    for (const co of companies) {
      const expectedBase = (SECTOR_EXPECTED[co.sector] || []);
      const coPresent = present.get(co.id) || new Set();

      for (const metric of expectedBase) {
        const skipSet = SKIP_TICKERS[co.ticker];
        if (skipSet && skipSet.has(metric)) continue;

        const missingYears = FISCAL_YEARS.filter((y) => !coPresent.has(`${metric}|${y}`));
        if (missingYears.length > 0) {
          targets.push({ company: co, metric, missingYears });
        }
      }
    }

    console.log(`  Found ${targets.length} company-metric combinations with missing years`);
  } else if (filterTicker) {
    const co = companyByTicker.get(filterTicker);
    if (!co) {
      console.error(`Company ${filterTicker} not found`);
      process.exit(1);
    }

    if (filterMetric) {
      targets.push({ company: co, metric: filterMetric, missingYears: [2021, 2022, 2023, 2024] });
    } else {
      // Detect gaps for this company
      const allMetrics = await fetchAll<{ metric_name: string; fiscal_year: number }>(
        "financial_metrics",
        "metric_name, fiscal_year",
        { period_type: "annual" }
      );
      // Filter for this company (need company_id filter)
      const { data: coMetrics } = await supabase
        .from("financial_metrics")
        .select("metric_name, fiscal_year")
        .eq("company_id", co.id)
        .eq("period_type", "annual");

      const coPresent = new Set((coMetrics || []).map((m: { metric_name: string; fiscal_year: number }) => `${m.metric_name}|${m.fiscal_year}`));
      const expectedBase = SECTOR_EXPECTED[co.sector] || [];
      const FISCAL_YEARS = [2021, 2022, 2023, 2024];

      for (const metric of expectedBase) {
        const missingYears = FISCAL_YEARS.filter((y) => !coPresent.has(`${metric}|${y}`));
        if (missingYears.length > 0) {
          targets.push({ company: co, metric, missingYears });
        }
      }
    }
  } else {
    console.error("Usage: --ticker <TICKER> [--metric <metric>] or --all-gaps");
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("\nNo gaps to scan. All expected metrics are present!");
    return;
  }

  // Group targets by company for efficient fetching
  const targetsByCompany = new Map<string, ScanTarget[]>();
  for (const t of targets) {
    if (!targetsByCompany.has(t.company.ticker)) targetsByCompany.set(t.company.ticker, []);
    targetsByCompany.get(t.company.ticker)!.push(t);
  }

  console.log(`\nScanning ${targetsByCompany.size} companies...`);

  // Track suggestions
  const suggestions: { ticker: string; metric: string; tag: string; taxonomy: string }[] = [];

  for (const [ticker, companyTargets] of targetsByCompany) {
    const co = companyTargets[0].company;
    console.log(`\n${"═".repeat(80)}`);
    console.log(`  ${ticker} — ${co.name} (${co.sector})`);
    console.log(`${"═".repeat(80)}`);

    // Fetch EDGAR CompanyFacts
    const paddedCik = co.cik.replace(/^0+/, "").padStart(10, "0");
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    let facts: Record<string, unknown>;
    try {
      const res = await rateLimitedFetch(url, userAgent);
      if (!res.ok) {
        console.log(`  EDGAR returned ${res.status} — skipping`);
        continue;
      }
      facts = await res.json() as Record<string, unknown>;
    } catch (err) {
      console.error(`  Error fetching EDGAR data: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    for (const target of companyTargets) {
      console.log(`\n  ─── ${target.metric} (missing: ${target.missingYears.map((y) => `FY${y}`).join(", ")}) ───`);

      // Show current aliases
      const currentAliases = CURRENT_ALIASES[target.metric];
      if (currentAliases) {
        console.log(`  Current aliases: ${currentAliases.join(", ")}`);
      }

      // Scan for candidates
      const candidates = scanForCandidates(facts, target.metric, target.missingYears, ticker);

      if (candidates.length === 0) {
        console.log(`  No candidate tags found`);
        continue;
      }

      // Show candidates
      const likelyMatches = candidates.filter((c) => c.recommendation === "LIKELY_MATCH");
      const possibleMatches = candidates.filter((c) => c.recommendation === "POSSIBLE_MATCH");
      const skipped = candidates.filter((c) => c.recommendation === "SKIP");

      if (likelyMatches.length > 0) {
        console.log(`\n  LIKELY MATCHES (${likelyMatches.length}):`);
        for (const c of likelyMatches) {
          console.log(`    ★ ${c.taxonomy}:${c.tag}`);
          console.log(`      Label: ${c.label}`);
          console.log(`      Unit: ${c.unit} | Years: ${c.yearsWithData.join(", ")} | IS=${c.isIncomeStatement}`);
          console.log(`      Values: ${c.sampleValues.map((v) => `FY${v.year}=${fmtValue(v.value, target.metric)}`).join(", ")}`);
          suggestions.push({ ticker, metric: target.metric, tag: c.tag, taxonomy: c.taxonomy });
        }
      }

      if (possibleMatches.length > 0) {
        console.log(`\n  POSSIBLE MATCHES (${possibleMatches.length}):`);
        for (const c of possibleMatches.slice(0, 5)) { // limit to 5
          console.log(`    ? ${c.taxonomy}:${c.tag}`);
          console.log(`      Label: ${c.label}`);
          console.log(`      Unit: ${c.unit} | Years: ${c.yearsWithData.join(", ")} | IS=${c.isIncomeStatement}`);
          console.log(`      Values: ${c.sampleValues.map((v) => `FY${v.year}=${fmtValue(v.value, target.metric)}`).join(", ")}`);
        }
        if (possibleMatches.length > 5) {
          console.log(`      ... and ${possibleMatches.length - 5} more possible matches`);
        }
      }

      if (skipped.length > 0) {
        console.log(`\n  SKIPPED (${skipped.length}):`);
        for (const c of skipped.slice(0, 3)) {
          console.log(`    ✗ ${c.taxonomy}:${c.tag} — ${c.skipReason}`);
        }
        if (skipped.length > 3) {
          console.log(`      ... and ${skipped.length - 3} more skipped`);
        }
      }
    }
  }

  // =====================================================================
  // SUMMARY: SUGGESTED ADDITIONS TO concepts.ts
  // =====================================================================
  if (suggestions.length > 0) {
    console.log("\n\n" + "=".repeat(100));
    console.log("  SUGGESTED ADDITIONS TO concepts.ts");
    console.log("=".repeat(100));

    // Group by metric
    const byMetric = new Map<string, { ticker: string; tag: string; taxonomy: string }[]>();
    for (const s of suggestions) {
      if (!byMetric.has(s.metric)) byMetric.set(s.metric, []);
      byMetric.get(s.metric)!.push(s);
    }

    for (const [metric, metricSuggestions] of byMetric) {
      // Deduplicate tags
      const uniqueTags = [...new Set(metricSuggestions.map((s) => s.tag))];
      const tickers = [...new Set(metricSuggestions.map((s) => s.ticker))];
      console.log(`\n  ${metric}:`);
      console.log(`    Companies affected: ${tickers.join(", ")}`);
      console.log(`    Suggested new aliases: ${uniqueTags.join(", ")}`);
    }
  }

  console.log("\n" + "=".repeat(100));
  console.log("  SCAN COMPLETE");
  console.log("=".repeat(100));
}

function fmtValue(val: number, metric: string): string {
  if (metric === "eps") return `$${val.toFixed(2)}`;
  if (metric === "shares_outstanding") return `${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(0)}`;
}

main().catch((err) => {
  console.error("SCAN FAILED:", err);
  process.exit(1);
});
