/**
 * InsurIntel — Data Gap Audit
 *
 * Builds a (company × metric × fiscal_year) matrix, classifies every gap:
 *   EXPECTED_KNOWN   — Documented exception (ALL losses, ERIE UW, BRK.B, etc.)
 *   EXPECTED_DERIVED — Missing because a base input metric is absent
 *   UNEXPECTED_BASE  — Base metric from EDGAR missing, not in known exceptions
 *   UNEXPECTED_DERIVED — Base metrics present but derived not calculated
 *
 * Run: npx tsx scripts/audit-data-gaps.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

// ========== Types ==========
interface CompanyRow {
  id: string;
  ticker: string;
  name: string;
  sector: string;
}

interface MetricRow {
  company_id: string;
  metric_name: string;
  metric_value: number;
  fiscal_year: number;
  period_type: string;
  is_derived: boolean;
}

type GapClass = "EXPECTED_KNOWN" | "EXPECTED_DERIVED" | "UNEXPECTED_BASE" | "UNEXPECTED_DERIVED";

interface Gap {
  ticker: string;
  sector: string;
  metric: string;
  year: number;
  classification: GapClass;
  reason: string;
}

// ========== Expected metrics per sector ==========
const SECTOR_EXPECTED: Record<string, string[]> = {
  "P&C": [
    "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
    "loss_ratio", "expense_ratio", "combined_ratio",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
    "premium_growth_yoy",
  ],
  "Life": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
  ],
  "Health": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "total_debt", "revenue", "medical_claims_expense",
    "roe", "roa", "book_value_per_share", "debt_to_equity", "medical_loss_ratio",
  ],
  "Reinsurance": [
    "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
    "loss_ratio", "expense_ratio", "combined_ratio",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
    "premium_growth_yoy",
  ],
  "Brokers": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "total_debt", "revenue",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
  ],
  "Title": [
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "total_debt", "revenue",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
  ],
  "Mortgage Insurance": [
    "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
    "net_income", "stockholders_equity", "total_assets", "total_liabilities",
    "eps", "shares_outstanding", "investment_income", "total_debt",
    "loss_ratio", "expense_ratio", "combined_ratio",
    "roe", "roa", "book_value_per_share", "debt_to_equity",
    "premium_growth_yoy",
  ],
};

// ========== Derived metric dependencies ==========
// Each derived metric -> list of base metrics required (OR groups wrapped in arrays)
const DERIVED_DEPS: Record<string, string[][]> = {
  loss_ratio: [["losses_incurred"], ["net_premiums_earned"]],
  expense_ratio: [["acquisition_costs", "underwriting_expenses"], ["net_premiums_earned"]], // at least one of acq/uw
  combined_ratio: [["loss_ratio"], ["expense_ratio"]],
  roe: [["net_income"], ["stockholders_equity"]],
  roa: [["net_income"], ["total_assets"]],
  book_value_per_share: [["stockholders_equity"], ["shares_outstanding"]],
  debt_to_equity: [["total_debt"], ["stockholders_equity"]],
  medical_loss_ratio: [["medical_claims_expense"], ["net_premiums_earned", "revenue"]], // either denominator
  premium_growth_yoy: [["net_premiums_earned"]], // needs current + prior year
};

const DERIVED_METRICS = new Set(Object.keys(DERIVED_DEPS));

const BASE_METRICS = new Set([
  "net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses",
  "net_income", "stockholders_equity", "total_assets", "total_liabilities",
  "eps", "shares_outstanding", "investment_income", "total_debt",
  "revenue", "medical_claims_expense",
]);

// ========== Known exceptions ==========
interface KnownException {
  ticker?: string;
  sector?: string;
  metric: string;
  years?: number[];
  reason: string;
}

const KNOWN_EXCEPTIONS: KnownException[] = [
  // ALL: losses_incurred bad XBRL tag FY2022-2024
  { ticker: "ALL", metric: "losses_incurred", years: [2022, 2023, 2024], reason: "Allstate XBRL tag reports reserve development only ($2.9B vs actual ~$40B+)" },
  { ticker: "ALL", metric: "loss_ratio", years: [2022, 2023, 2024], reason: "Cascade: losses_incurred bad XBRL data" },
  { ticker: "ALL", metric: "combined_ratio", years: [2022, 2023, 2024], reason: "Cascade: losses_incurred bad XBRL data" },

  // ERIE: management company, lacks underwriting metrics
  { ticker: "ERIE", metric: "net_premiums_earned", reason: "Management company — does not underwrite directly" },
  { ticker: "ERIE", metric: "losses_incurred", reason: "Management company — does not underwrite directly" },
  { ticker: "ERIE", metric: "acquisition_costs", reason: "Management company — does not underwrite directly" },
  { ticker: "ERIE", metric: "underwriting_expenses", reason: "Management company — does not underwrite directly" },
  { ticker: "ERIE", metric: "investment_income", reason: "Management company — limited investment portfolio" },
  { ticker: "ERIE", metric: "loss_ratio", reason: "Cascade: no underwriting metrics" },
  { ticker: "ERIE", metric: "expense_ratio", reason: "Cascade: no underwriting metrics" },
  { ticker: "ERIE", metric: "combined_ratio", reason: "Cascade: no underwriting metrics" },
  { ticker: "ERIE", metric: "premium_growth_yoy", reason: "Cascade: no net_premiums_earned" },

  // BRK.B: conglomerate, many metrics missing
  { ticker: "BRK.B", metric: "eps", reason: "Conglomerate XBRL — limited insurance-specific reporting" },
  { ticker: "BRK.B", metric: "acquisition_costs", reason: "Conglomerate — aggregated reporting" },
  { ticker: "BRK.B", metric: "underwriting_expenses", reason: "Conglomerate — aggregated reporting" },
  { ticker: "BRK.B", metric: "expense_ratio", reason: "Cascade: no acquisition_costs/underwriting_expenses" },
  { ticker: "BRK.B", metric: "combined_ratio", reason: "Cascade: no expense_ratio" },
  { ticker: "BRK.B", metric: "book_value_per_share", reason: "Cascade: shares_outstanding may be missing" },

  // BRK.B: more structural gaps
  { ticker: "BRK.B", metric: "net_premiums_earned", reason: "Conglomerate — no standard premium tags in XBRL" },
  { ticker: "BRK.B", metric: "losses_incurred", reason: "Conglomerate — no standard claims tags in XBRL" },
  { ticker: "BRK.B", metric: "investment_income", reason: "Conglomerate — investment income not separately tagged" },
  { ticker: "BRK.B", metric: "shares_outstanding", reason: "Class A/B share structure — non-standard XBRL" },
  { ticker: "BRK.B", metric: "total_liabilities", years: [2021], reason: "FY2021 data not available via Liabilities tag" },
  { ticker: "BRK.B", metric: "total_debt", years: [2024], reason: "FY2024 total_debt tag gap" },
  { ticker: "BRK.B", metric: "loss_ratio", reason: "Cascade: no losses_incurred" },
  { ticker: "BRK.B", metric: "premium_growth_yoy", reason: "Cascade: no net_premiums_earned" },
  { ticker: "BRK.B", metric: "debt_to_equity", years: [2024], reason: "Cascade: no total_debt FY2024" },

  // ERIE: also missing eps, shares, total_debt — management company structure
  { ticker: "ERIE", metric: "eps", reason: "Management company — non-standard XBRL reporting" },
  { ticker: "ERIE", metric: "shares_outstanding", reason: "Management company — Class A/B structure not in standard tags" },
  { ticker: "ERIE", metric: "total_debt", years: [2023, 2024], reason: "Debt-free since FY2023 — no tag reported" },
  { ticker: "ERIE", metric: "book_value_per_share", reason: "Cascade: no shares_outstanding" },
  { ticker: "ERIE", metric: "debt_to_equity", years: [2023, 2024], reason: "Cascade: no total_debt" },

  // RYAN: UP-C structure, non-standard share reporting
  { ticker: "RYAN", metric: "eps", reason: "UP-C structure — standard EPS tags not used" },
  { ticker: "RYAN", metric: "shares_outstanding", reason: "UP-C structure — multi-class shares not in standard tags" },
  { ticker: "RYAN", metric: "book_value_per_share", reason: "Cascade: no shares_outstanding" },

  // CNA: no underwriting_expenses tag in XBRL
  { ticker: "CNA", metric: "underwriting_expenses", reason: "CNA does not use any standard underwriting expense tag in XBRL" },

  // WRB: FY2021 data gaps (seed year cutoff — FY2021 at edge of 5-year window)
  { ticker: "WRB", metric: "stockholders_equity", years: [2021], reason: "FY2021 at edge of seed year cutoff window" },
  { ticker: "WRB", metric: "total_assets", years: [2021], reason: "FY2021 at edge of seed year cutoff window" },
  { ticker: "WRB", metric: "total_liabilities", years: [2021], reason: "FY2021 at edge of seed year cutoff window" },
  { ticker: "WRB", metric: "total_debt", years: [2021], reason: "FY2021 at edge of seed year cutoff window" },

  // CRBG: IPO in Sep 2022, no pre-IPO data
  { ticker: "CRBG", metric: "net_premiums_earned", years: [2021], reason: "IPO Sep 2022 — no pre-IPO SEC filings" },
  { ticker: "CRBG", metric: "losses_incurred", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "net_income", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "stockholders_equity", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "total_assets", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "total_liabilities", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "eps", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "shares_outstanding", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "investment_income", years: [2021], reason: "IPO Sep 2022" },
  { ticker: "CRBG", metric: "total_debt", years: [2021], reason: "IPO Sep 2022" },

  // RYAN: IPO Jul 2021, limited 2021 data
  { ticker: "RYAN", metric: "total_assets", years: [2021], reason: "IPO Jul 2021 — limited first-year filings" },
  { ticker: "RYAN", metric: "total_liabilities", years: [2021], reason: "IPO Jul 2021" },
  { ticker: "RYAN", metric: "stockholders_equity", years: [2021], reason: "IPO Jul 2021" },
  { ticker: "RYAN", metric: "total_debt", years: [2021], reason: "IPO Jul 2021" },

  // AON: negative equity from share buybacks FY2022-2023 — derived ratios deleted
  { ticker: "AON", metric: "roe", years: [2022, 2023], reason: "Negative equity from buybacks — ratio meaningless (was -603%, -310%)" },
  { ticker: "AON", metric: "debt_to_equity", years: [2022, 2023], reason: "Negative equity from buybacks — ratio meaningless (was -22.9x, -12.1x)" },
  { ticker: "AON", metric: "book_value_per_share", years: [2022, 2023], reason: "Negative equity from buybacks — BVPS meaningless" },

  // WRB: DEI shares_outstanding reports Class A only (~285K shares) → BVPS inflated
  { ticker: "WRB", metric: "book_value_per_share", reason: "DEI shares_outstanding is Class A only (~285K vs ~330M total) — BVPS inflated to $16K-$21K" },

  // AON/AJG: revenue alias gap (brokers use non-standard tags)
  { ticker: "AON", metric: "revenue", reason: "Uses non-standard revenue tags not in our aliases" },
  { ticker: "AJG", metric: "revenue", reason: "Uses non-standard revenue tags not in our aliases" },

  // Brokers: don't have insurance underwriting metrics (not applicable, but just in case)
  { sector: "Brokers", metric: "net_premiums_earned", reason: "Brokers are distributors, not carriers" },
  { sector: "Brokers", metric: "losses_incurred", reason: "Brokers are distributors, not carriers" },
  { sector: "Brokers", metric: "acquisition_costs", reason: "Brokers are distributors, not carriers" },
  { sector: "Brokers", metric: "underwriting_expenses", reason: "Brokers are distributors, not carriers" },
  { sector: "Brokers", metric: "investment_income", reason: "Brokers are distributors, not carriers" },

  // AGO: financial guaranty (bond insurance), not traditional P&C — loss/combined ratios deleted
  { ticker: "AGO", metric: "underwriting_expenses", reason: "Financial guaranty — no standard UW expense tags" },
  { ticker: "AGO", metric: "loss_ratio", reason: "Financial guaranty — ratios deleted (reserve releases cause negatives)" },
  { ticker: "AGO", metric: "combined_ratio", reason: "Financial guaranty — ratios deleted (reserve releases cause negatives)" },
  { ticker: "AGO", metric: "expense_ratio", reason: "Cascade: no underwriting_expenses" },

  // GSHD: negative equity FY2021-2022 — calculator guards correctly skip derived ratios
  { ticker: "GSHD", metric: "roe", years: [2021, 2022], reason: "Negative equity — calculator guard (equity > 0)" },
  { ticker: "GSHD", metric: "debt_to_equity", years: [2021, 2022], reason: "Negative equity — calculator guard (equity > 0)" },
  { ticker: "GSHD", metric: "book_value_per_share", years: [2021, 2022], reason: "Negative equity — calculator guard (equity > 0)" },
  { ticker: "GSHD", metric: "total_debt", years: [2021, 2022], reason: "Pre-IPO limited debt data" },

  // KMPR: negative equity FY2021 (-$849.7M) — calculator guards correctly skip derived ratios
  { ticker: "KMPR", metric: "losses_incurred", reason: "Missing XBRL alias — Kemper uses non-standard claims tag" },
  { ticker: "KMPR", metric: "loss_ratio", reason: "Cascade: no losses_incurred" },
  { ticker: "KMPR", metric: "combined_ratio", reason: "Cascade: no losses_incurred → no loss_ratio" },
  { ticker: "KMPR", metric: "roe", years: [2021], reason: "Negative equity FY2021 (-$849.7M) — calculator guard" },
  { ticker: "KMPR", metric: "debt_to_equity", years: [2021], reason: "Negative equity FY2021 — calculator guard" },
  { ticker: "KMPR", metric: "book_value_per_share", years: [2021], reason: "Negative equity FY2021 — calculator guard" },

  // PLMR: small specialty insurer, likely debt-free
  { ticker: "PLMR", metric: "total_debt", reason: "Small specialty insurer — likely debt-free (no debt XBRL tags)" },

  // PRI: Primerica, likely debt-free
  { ticker: "PRI", metric: "total_debt", reason: "Primerica — likely debt-free (no debt XBRL tags)" },

  // BRP: Baldwin Insurance Group — pre-IPO limited data
  { ticker: "BRP", metric: "total_debt", years: [2021, 2022], reason: "Pre-IPO/early filing — limited debt data" },

  // HG: Hamilton Insurance Group — IPO Nov 2023, FY2021 is from S-1 comparatives
  { ticker: "HG", metric: "total_assets", years: [2021], reason: "Pre-IPO (Nov 2023) — S-1 comparatives limited" },
  { ticker: "HG", metric: "total_liabilities", years: [2021], reason: "Pre-IPO — S-1 comparatives limited" },
  { ticker: "HG", metric: "total_debt", years: [2021], reason: "Pre-IPO — S-1 comparatives limited" },

  // AXS: AXIS Capital — missing XBRL aliases for investment_income and total_debt
  { ticker: "AXS", metric: "investment_income", reason: "Missing XBRL alias — AXIS uses non-standard tag" },
  { ticker: "AXS", metric: "total_debt", reason: "Missing XBRL alias — AXIS uses non-standard tag" },

  // MCY: Mercury General — FY2024 underwriting_expenses gap (possible tag change)
  { ticker: "MCY", metric: "underwriting_expenses", years: [2024], reason: "FY2024 tag change or filing gap" },

  // RLI: FY2024 gaps for acquisition_costs and total_debt
  { ticker: "RLI", metric: "acquisition_costs", years: [2024], reason: "FY2024 filing lag or tag change" },
  { ticker: "RLI", metric: "total_debt", years: [2024], reason: "FY2024 filing lag or tag change" },

  // VOYA: retirement/investment company — premiums deleted (tag mismatch)
  { ticker: "VOYA", metric: "net_premiums_earned", reason: "Retirement company — premiums deleted (XBRL tag mismatch)" },

  // FG: F&G Annuities & Life — IPO Dec 2022
  { ticker: "FG", metric: "eps", years: [2021], reason: "Pre-IPO (Dec 2022) — limited S-1 data" },
  { ticker: "FG", metric: "shares_outstanding", years: [2021], reason: "Pre-IPO — limited S-1 data" },

  // Title sector: no underwriting ratios expected
  { sector: "Title", metric: "net_premiums_earned", reason: "Title insurers — premiums not applicable" },
  { sector: "Title", metric: "losses_incurred", reason: "Title insurers — claims structure differs from P&C" },
  { sector: "Title", metric: "acquisition_costs", reason: "Title insurers — no standard UW cost tags" },
  { sector: "Title", metric: "underwriting_expenses", reason: "Title insurers — no standard UW expense tags" },
  { sector: "Title", metric: "investment_income", reason: "Title insurers — investment income not primary" },

  // Mortgage Insurance: different expense structures from P&C — non-standard XBRL tags
  { ticker: "ESNT", metric: "underwriting_expenses", reason: "MI companies use different expense XBRL tags than P&C" },
  { ticker: "ESNT", metric: "acquisition_costs", reason: "MI companies use different expense XBRL tags than P&C" },
  { ticker: "NMIH", metric: "underwriting_expenses", reason: "MI companies use different expense XBRL tags than P&C" },
  { ticker: "NMIH", metric: "total_debt", reason: "NMI Holdings — uses non-standard debt XBRL tags" },
  { ticker: "RDN", metric: "underwriting_expenses", reason: "MI companies use different expense XBRL tags than P&C" },
  { ticker: "MTG", metric: "underwriting_expenses", reason: "MI companies use different expense XBRL tags than P&C" },
  { ticker: "MTG", metric: "acquisition_costs", reason: "MI companies use different expense XBRL tags than P&C" },
];

function isKnownException(ticker: string, sector: string, metric: string, year: number): KnownException | undefined {
  return KNOWN_EXCEPTIONS.find((ex) => {
    if (ex.ticker && ex.ticker !== ticker) return false;
    if (ex.sector && ex.sector !== sector) return false;
    if (ex.metric !== metric) return false;
    if (ex.years && !ex.years.includes(year)) return false;
    return true;
  });
}

// ========== Paginated fetcher ==========
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

// ========== Classify a gap ==========
function classifyGap(
  ticker: string,
  sector: string,
  metric: string,
  year: number,
  metricsForYear: Set<string>,
  allYearMetrics: Map<number, Set<string>>
): Gap {
  // Check known exception first
  const known = isKnownException(ticker, sector, metric, year);
  if (known) {
    return { ticker, sector, metric, year, classification: "EXPECTED_KNOWN", reason: known.reason };
  }

  // Check if it's a derived metric
  if (DERIVED_METRICS.has(metric)) {
    const deps = DERIVED_DEPS[metric];
    if (deps) {
      // Check each dependency group
      for (const group of deps) {
        // For premium_growth_yoy, also need prior year
        if (metric === "premium_growth_yoy") {
          const priorYear = allYearMetrics.get(year - 1);
          if (!priorYear || !priorYear.has("net_premiums_earned")) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing net_premiums_earned for prior year FY${year - 1}`,
            };
          }
          if (!metricsForYear.has("net_premiums_earned")) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing net_premiums_earned for current year FY${year}`,
            };
          }
        }

        // For expense_ratio, need at least one of acq_costs or uw_expenses
        if (metric === "expense_ratio") {
          const hasAcq = metricsForYear.has("acquisition_costs");
          const hasUw = metricsForYear.has("underwriting_expenses");
          const hasNpe = metricsForYear.has("net_premiums_earned");
          if (!hasAcq && !hasUw) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing both acquisition_costs and underwriting_expenses`,
            };
          }
          if (!hasNpe) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing net_premiums_earned (denominator)`,
            };
          }
        }

        // For medical_loss_ratio, need either denominator
        if (metric === "medical_loss_ratio") {
          if (!metricsForYear.has("medical_claims_expense")) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing medical_claims_expense`,
            };
          }
          if (!metricsForYear.has("net_premiums_earned") && !metricsForYear.has("revenue")) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing both net_premiums_earned and revenue (denominator)`,
            };
          }
        }

        // General OR-group check: at least one metric from each group must be present
        if (group.length > 0) {
          const hasAny = group.some((dep) => metricsForYear.has(dep));
          if (!hasAny) {
            return {
              ticker, sector, metric, year,
              classification: "EXPECTED_DERIVED",
              reason: `Missing base input(s): ${group.join(" OR ")}`,
            };
          }
        }
      }

      // All base inputs present but derived metric not calculated
      return {
        ticker, sector, metric, year,
        classification: "UNEXPECTED_DERIVED",
        reason: `Base inputs present but derived metric not stored`,
      };
    }
  }

  // It's a base metric and not known exception → unexpected gap
  return {
    ticker, sector, metric, year,
    classification: "UNEXPECTED_BASE",
    reason: `Base metric missing from EDGAR data — possible alias gap`,
  };
}

// ========== MAIN ==========
async function main() {
  console.log("=".repeat(100));
  console.log("  INSURINTEL DATA GAP AUDIT");
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log("=".repeat(100));

  // Fetch data
  console.log("\nFetching data...");
  const companies = await fetchAll<CompanyRow>("companies", "id, ticker, name, sector");
  console.log(`  Companies: ${companies.length}`);

  const allMetrics = await fetchAll<MetricRow>(
    "financial_metrics",
    "company_id, metric_name, metric_value, fiscal_year, period_type, is_derived",
    { period_type: "annual" }
  );
  console.log(`  Annual metric rows: ${allMetrics.length}`);

  // Build lookups
  const companyById = new Map<string, CompanyRow>();
  for (const c of companies) companyById.set(c.id, c);

  // company_id -> fiscal_year -> Set<metric_name>
  const dataMatrix = new Map<string, Map<number, Set<string>>>();
  for (const m of allMetrics) {
    if (!dataMatrix.has(m.company_id)) dataMatrix.set(m.company_id, new Map());
    const yearMap = dataMatrix.get(m.company_id)!;
    if (!yearMap.has(m.fiscal_year)) yearMap.set(m.fiscal_year, new Set());
    yearMap.get(m.fiscal_year)!.add(m.metric_name);
  }

  const FISCAL_YEARS = [2021, 2022, 2023, 2024];
  const gaps: Gap[] = [];

  // =====================================================================
  // SECTION A: VISUAL MATRIX
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION A: DATA AVAILABILITY MATRIX");
  console.log("  (Digits = years with data, '.' = gap)");
  console.log("=".repeat(100));

  // Get all metric names we expect, sorted
  const allExpectedMetrics = [...new Set(Object.values(SECTOR_EXPECTED).flat())].sort();

  // Abbreviate metric names for column headers
  const metricAbbrev: Record<string, string> = {
    net_premiums_earned: "NPE",
    losses_incurred: "Loss",
    acquisition_costs: "AcqC",
    underwriting_expenses: "UWEx",
    net_income: "NI",
    stockholders_equity: "Eqty",
    total_assets: "TotA",
    total_liabilities: "TotL",
    eps: "EPS",
    shares_outstanding: "Shrs",
    investment_income: "InvI",
    total_debt: "Debt",
    revenue: "Rev",
    medical_claims_expense: "MedC",
    loss_ratio: "LR",
    expense_ratio: "ER",
    combined_ratio: "CR",
    roe: "ROE",
    roa: "ROA",
    book_value_per_share: "BVPS",
    debt_to_equity: "D/E",
    medical_loss_ratio: "MLR",
    premium_growth_yoy: "PGrw",
  };

  // Group by sector
  const bySector = new Map<string, CompanyRow[]>();
  for (const c of companies) {
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector)!.push(c);
  }

  for (const [sector, sectorCos] of bySector) {
    const expectedMetrics = SECTOR_EXPECTED[sector] || [];
    if (expectedMetrics.length === 0) continue;

    const sorted = [...sectorCos].sort((a, b) => a.ticker.localeCompare(b.ticker));

    // Header
    console.log(`\n  ─── ${sector} ───`);
    const headerCols = expectedMetrics.map((m) => (metricAbbrev[m] || m.substring(0, 4)).padStart(5));
    console.log(`  ${"Ticker".padEnd(8)} ${headerCols.join("")}`);
    console.log(`  ${"─".repeat(8)} ${expectedMetrics.map(() => "─────").join("")}`);

    for (const co of sorted) {
      const yearMap = dataMatrix.get(co.id) || new Map();

      let row = `  ${co.ticker.padEnd(8)} `;
      for (const metric of expectedMetrics) {
        const yearsPresent: string[] = [];
        for (const fy of FISCAL_YEARS) {
          const metrics = yearMap.get(fy);
          if (metrics && metrics.has(metric)) {
            yearsPresent.push(String(fy).slice(-1)); // last digit: 1,2,3,4
          } else {
            yearsPresent.push(".");

            // Classify the gap
            const gap = classifyGap(co.ticker, co.sector, metric, fy, metrics || new Set(), yearMap);
            gaps.push(gap);
          }
        }
        row += yearsPresent.join("").padStart(5);
      }
      console.log(row);
    }
  }

  // =====================================================================
  // SECTION B: GAP REPORT BY CLASSIFICATION
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION B: GAP CLASSIFICATION REPORT");
  console.log("=".repeat(100));

  const gapsByClass: Record<GapClass, Gap[]> = {
    EXPECTED_KNOWN: [],
    EXPECTED_DERIVED: [],
    UNEXPECTED_BASE: [],
    UNEXPECTED_DERIVED: [],
  };

  for (const g of gaps) {
    gapsByClass[g.classification].push(g);
  }

  console.log(`\n  Total gaps: ${gaps.length}`);
  console.log(`    EXPECTED_KNOWN:    ${gapsByClass.EXPECTED_KNOWN.length} (documented exceptions)`);
  console.log(`    EXPECTED_DERIVED:  ${gapsByClass.EXPECTED_DERIVED.length} (missing base inputs)`);
  console.log(`    UNEXPECTED_BASE:   ${gapsByClass.UNEXPECTED_BASE.length} ← ACTION NEEDED`);
  console.log(`    UNEXPECTED_DERIVED: ${gapsByClass.UNEXPECTED_DERIVED.length} ← POSSIBLE BUG`);

  // UNEXPECTED_BASE detail
  if (gapsByClass.UNEXPECTED_BASE.length > 0) {
    console.log("\n  ───── UNEXPECTED BASE GAPS (possible alias gaps) ─────");
    const byTickerMetric = new Map<string, Gap[]>();
    for (const g of gapsByClass.UNEXPECTED_BASE) {
      const key = `${g.ticker}|${g.metric}`;
      if (!byTickerMetric.has(key)) byTickerMetric.set(key, []);
      byTickerMetric.get(key)!.push(g);
    }

    for (const [key, gapList] of [...byTickerMetric.entries()].sort()) {
      const [ticker, metric] = key.split("|");
      const years = gapList.map((g) => `FY${g.year}`).join(", ");
      const sector = gapList[0].sector;
      console.log(`    ${ticker.padEnd(8)} ${sector.padEnd(14)} ${metric.padEnd(24)} ${years}`);
    }
  }

  // UNEXPECTED_DERIVED detail
  if (gapsByClass.UNEXPECTED_DERIVED.length > 0) {
    console.log("\n  ───── UNEXPECTED DERIVED GAPS (possible calculator bug) ─────");
    const byTickerMetric = new Map<string, Gap[]>();
    for (const g of gapsByClass.UNEXPECTED_DERIVED) {
      const key = `${g.ticker}|${g.metric}`;
      if (!byTickerMetric.has(key)) byTickerMetric.set(key, []);
      byTickerMetric.get(key)!.push(g);
    }

    for (const [key, gapList] of [...byTickerMetric.entries()].sort()) {
      const [ticker, metric] = key.split("|");
      const years = gapList.map((g) => `FY${g.year}`).join(", ");
      const sector = gapList[0].sector;
      console.log(`    ${ticker.padEnd(8)} ${sector.padEnd(14)} ${metric.padEnd(24)} ${years}  — ${gapList[0].reason}`);
    }
  }

  // EXPECTED_DERIVED summary
  if (gapsByClass.EXPECTED_DERIVED.length > 0) {
    console.log("\n  ───── EXPECTED DERIVED GAPS (cascading from base) ─────");
    // Group by root cause (the missing base metric)
    const byRootCause = new Map<string, number>();
    for (const g of gapsByClass.EXPECTED_DERIVED) {
      const cause = `${g.ticker}:${g.reason}`;
      byRootCause.set(cause, (byRootCause.get(cause) || 0) + 1);
    }
    const sortedCauses = [...byRootCause.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    for (const [cause, count] of sortedCauses) {
      console.log(`    ${count} gap(s): ${cause}`);
    }
    if (byRootCause.size > 30) {
      console.log(`    ... and ${byRootCause.size - 30} more root causes`);
    }
  }

  // =====================================================================
  // SECTION C: IMPACT SUMMARY
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION C: IMPACT SUMMARY");
  console.log("=".repeat(100));

  // Which metrics have the most gaps?
  const gapsByMetric = new Map<string, number>();
  const unexpectedByMetric = new Map<string, number>();
  for (const g of gaps) {
    gapsByMetric.set(g.metric, (gapsByMetric.get(g.metric) || 0) + 1);
    if (g.classification === "UNEXPECTED_BASE" || g.classification === "UNEXPECTED_DERIVED") {
      unexpectedByMetric.set(g.metric, (unexpectedByMetric.get(g.metric) || 0) + 1);
    }
  }

  console.log("\n  Metrics by total gaps (all classifications):");
  for (const [metric, count] of [...gapsByMetric.entries()].sort((a, b) => b[1] - a[1])) {
    const unexpected = unexpectedByMetric.get(metric) || 0;
    const marker = unexpected > 0 ? ` (${unexpected} UNEXPECTED)` : "";
    console.log(`    ${metric.padEnd(24)} ${String(count).padStart(4)} gaps${marker}`);
  }

  // Which companies have the most unexpected gaps?
  const unexpectedByTicker = new Map<string, number>();
  for (const g of gaps) {
    if (g.classification === "UNEXPECTED_BASE" || g.classification === "UNEXPECTED_DERIVED") {
      unexpectedByTicker.set(g.ticker, (unexpectedByTicker.get(g.ticker) || 0) + 1);
    }
  }

  if (unexpectedByTicker.size > 0) {
    console.log("\n  Companies by unexpected gap count:");
    for (const [ticker, count] of [...unexpectedByTicker.entries()].sort((a, b) => b[1] - a[1])) {
      const co = companies.find((c) => c.ticker === ticker);
      console.log(`    ${ticker.padEnd(8)} ${(co?.sector || "").padEnd(14)} ${count} unexpected gaps`);
    }
  }

  // =====================================================================
  // SECTION D: PRIORITIZED FIX LIST
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION D: PRIORITIZED FIX LIST");
  console.log("  (Sorted by cascading impact — fixing one base metric can fill multiple derived gaps)");
  console.log("=".repeat(100));

  // For each UNEXPECTED_BASE gap, count how many EXPECTED_DERIVED gaps it would fix
  const fixImpact = new Map<string, { baseGaps: Gap[]; cascadeCount: number; tickers: Set<string> }>();

  for (const g of gapsByClass.UNEXPECTED_BASE) {
    const key = g.metric;
    if (!fixImpact.has(key)) fixImpact.set(key, { baseGaps: [], cascadeCount: 0, tickers: new Set() });
    fixImpact.get(key)!.baseGaps.push(g);
    fixImpact.get(key)!.tickers.add(g.ticker);
  }

  // Count cascading derived gaps that would be fixed
  for (const g of gapsByClass.EXPECTED_DERIVED) {
    // Parse the reason to find which base metric is missing
    for (const [baseMetric, impact] of fixImpact) {
      if (g.reason.includes(baseMetric) && impact.tickers.has(g.ticker)) {
        impact.cascadeCount++;
      }
    }
  }

  if (fixImpact.size > 0) {
    console.log("\n  Priority  Base Metric              Companies    Base Gaps  Cascade Fix  Total Impact");
    console.log("  " + "─".repeat(90));

    const sorted = [...fixImpact.entries()].sort(
      (a, b) => (b[1].baseGaps.length + b[1].cascadeCount) - (a[1].baseGaps.length + a[1].cascadeCount)
    );

    let priority = 1;
    for (const [metric, impact] of sorted) {
      const total = impact.baseGaps.length + impact.cascadeCount;
      const tickers = [...impact.tickers].sort().join(", ");
      console.log(
        `  ${String(priority).padStart(4)}     ${metric.padEnd(24)} ${tickers.padEnd(12)} ${String(impact.baseGaps.length).padStart(9)}  ${String(impact.cascadeCount).padStart(11)}  ${String(total).padStart(12)}`
      );
      priority++;
    }
  } else {
    console.log("\n  No unexpected base gaps found — all gaps are either expected or derived cascades.");
  }

  // =====================================================================
  // SUMMARY
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  AUDIT COMPLETE");
  console.log("=".repeat(100));

  const totalCompanies = companies.length;
  const totalExpectedDataPoints = companies.reduce((sum, c) => {
    const expected = SECTOR_EXPECTED[c.sector] || [];
    return sum + expected.length * FISCAL_YEARS.length;
  }, 0);
  const totalPresent = totalExpectedDataPoints - gaps.length;
  const coveragePct = ((totalPresent / totalExpectedDataPoints) * 100).toFixed(1);

  console.log(`\n  Companies: ${totalCompanies}`);
  console.log(`  Expected data points: ${totalExpectedDataPoints} (${FISCAL_YEARS.length} years × metrics per sector)`);
  console.log(`  Present: ${totalPresent} (${coveragePct}% coverage)`);
  console.log(`  Gaps: ${gaps.length}`);
  console.log(`    Expected (known + derived cascades): ${gapsByClass.EXPECTED_KNOWN.length + gapsByClass.EXPECTED_DERIVED.length}`);
  console.log(`    Actionable (unexpected base + derived): ${gapsByClass.UNEXPECTED_BASE.length + gapsByClass.UNEXPECTED_DERIVED.length}`);

  if (gapsByClass.UNEXPECTED_BASE.length > 0) {
    console.log(`\n  NEXT STEP: Run scan-edgar-tags.ts to find candidate XBRL aliases for ${gapsByClass.UNEXPECTED_BASE.length} unexpected base gaps`);
  }
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
