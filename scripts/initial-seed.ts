/**
 * Initial data seed script.
 *
 * Run locally with:
 *   npx tsx scripts/initial-seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and EDGAR_USER_AGENT environment variables.
 *
 * This script:
 *  1. Seeds all companies from the seed list
 *  2. Fetches EDGAR data for each company sequentially
 *  3. Computes derived metrics
 *  4. Upserts everything into the database
 *  5. Refreshes materialized views
 */

import { createClient } from "@supabase/supabase-js";

// Inline the constants to avoid path alias issues in tsx runner
const COMPANIES_SEED = [
  // P&C (24)
  { cik: "0000896159", ticker: "CB", name: "Chubb Limited", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000080661", ticker: "PGR", name: "Progressive Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000086312", ticker: "TRV", name: "Travelers Companies", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000899051", ticker: "ALL", name: "Allstate Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000005272", ticker: "AIG", name: "American International Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000874766", ticker: "HIG", name: "Hartford Financial Services", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000947484", ticker: "ACGL", name: "Arch Capital Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000011544", ticker: "WRB", name: "W.R. Berkley Corporation", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000020286", ticker: "CINF", name: "Cincinnati Financial", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001096343", ticker: "MKL", name: "Markel Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000021175", ticker: "CNA", name: "CNA Financial", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000922621", ticker: "ERIE", name: "Erie Indemnity", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0001042046", ticker: "AFG", name: "American Financial Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000074260", ticker: "ORI", name: "Old Republic International", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001267238", ticker: "AIZ", name: "Assurant", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0001669162", ticker: "KNSL", name: "Kinsale Capital Group", sector: "P&C", sub_sector: "E&S Specialty", sic_code: "6331" },
  { cik: "0000084246", ticker: "RLI", name: "RLI Corp", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000230557", ticker: "SIGI", name: "Selective Insurance Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0001761312", ticker: "PLMR", name: "Palomar Holdings", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0000944695", ticker: "THG", name: "Hanover Insurance Group", sector: "P&C", sub_sector: "Commercial Lines", sic_code: "6331" },
  { cik: "0000860748", ticker: "KMPR", name: "Kemper Corporation", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000064996", ticker: "MCY", name: "Mercury General", sector: "P&C", sub_sector: "Personal Lines", sic_code: "6331" },
  { cik: "0000776867", ticker: "WTM", name: "White Mountains Insurance Group", sector: "P&C", sub_sector: "Specialty", sic_code: "6331" },
  { cik: "0001273813", ticker: "AGO", name: "Assured Guaranty", sector: "P&C", sub_sector: "Financial Guaranty", sic_code: "6351" },
  // Life (15)
  { cik: "0001099219", ticker: "MET", name: "MetLife", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001137774", ticker: "PRU", name: "Prudential Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000004977", ticker: "AFL", name: "Aflac", sector: "Life", sub_sector: "Supplemental", sic_code: "6311" },
  { cik: "0001889539", ticker: "CRBG", name: "Corebridge Financial", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001126328", ticker: "PFG", name: "Principal Financial Group", sector: "Life", sub_sector: "Retirement", sic_code: "6311" },
  { cik: "0001333986", ticker: "EQH", name: "Equitable Holdings", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000005513", ticker: "UNM", name: "Unum Group", sector: "Life", sub_sector: "Disability & Benefits", sic_code: "6311" },
  { cik: "0000320335", ticker: "GL", name: "Globe Life", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0000059558", ticker: "LNC", name: "Lincoln National", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  { cik: "0001822993", ticker: "JXN", name: "Jackson Financial", sector: "Life", sub_sector: "Annuities", sic_code: "6311" },
  { cik: "0001535929", ticker: "VOYA", name: "Voya Financial", sector: "Life", sub_sector: "Retirement", sic_code: "6311" },
  { cik: "0001276520", ticker: "GNW", name: "Genworth Financial", sector: "Life", sub_sector: "LTC / Mortgage Insurance", sic_code: "6311" },
  { cik: "0001224608", ticker: "CNO", name: "CNO Financial Group", sector: "Life", sub_sector: "Life & Health", sic_code: "6311" },
  { cik: "0001475922", ticker: "PRI", name: "Primerica", sector: "Life", sub_sector: "Life Insurance", sic_code: "6311" },
  { cik: "0001934850", ticker: "FG", name: "F&G Annuities & Life", sector: "Life", sub_sector: "Life & Annuities", sic_code: "6311" },
  // Health (8)
  { cik: "0000731766", ticker: "UNH", name: "UnitedHealth Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001739940", ticker: "CI", name: "Cigna Group", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0001156039", ticker: "ELV", name: "Elevance Health", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  { cik: "0000049071", ticker: "HUM", name: "Humana", sector: "Health", sub_sector: "Medicare Advantage", sic_code: "6324" },
  { cik: "0001071739", ticker: "CNC", name: "Centene Corporation", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0001179929", ticker: "MOH", name: "Molina Healthcare", sector: "Health", sub_sector: "Medicaid", sic_code: "6324" },
  { cik: "0000064803", ticker: "CVS", name: "CVS Health", sector: "Health", sub_sector: "Integrated Health", sic_code: "6324" },
  { cik: "0001568651", ticker: "OSCR", name: "Oscar Health", sector: "Health", sub_sector: "Managed Care", sic_code: "6324" },
  // Reinsurance (7)
  { cik: "0001067983", ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6331" },
  { cik: "0000913144", ticker: "RNR", name: "RenaissanceRe Holdings", sector: "Reinsurance", sub_sector: "Property Cat", sic_code: "6399" },
  { cik: "0001095073", ticker: "EG", name: "Everest Group", sector: "Reinsurance", sub_sector: "Diversified", sic_code: "6399" },
  { cik: "0000898174", ticker: "RGA", name: "Reinsurance Group of America", sector: "Reinsurance", sub_sector: "Life Reinsurance", sic_code: "6311" },
  { cik: "0001576018", ticker: "SPNT", name: "SiriusPoint", sector: "Reinsurance", sub_sector: "Multi-line", sic_code: "6399" },
  { cik: "0001593275", ticker: "HG", name: "Hamilton Insurance Group", sector: "Reinsurance", sub_sector: "Specialty", sic_code: "6399" },
  { cik: "0001214816", ticker: "AXS", name: "AXIS Capital Holdings", sector: "Reinsurance", sub_sector: "Specialty", sic_code: "6399" },
  // Brokers (8)
  { cik: "0000062709", ticker: "MMC", name: "Marsh & McLennan", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000315293", ticker: "AON", name: "Aon plc", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000354190", ticker: "AJG", name: "Arthur J. Gallagher", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001140536", ticker: "WTW", name: "Willis Towers Watson", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0000079282", ticker: "BRO", name: "Brown & Brown", sector: "Brokers", sub_sector: "Brokerage", sic_code: "6411" },
  { cik: "0001849253", ticker: "RYAN", name: "Ryan Specialty Holdings", sector: "Brokers", sub_sector: "Specialty Brokerage", sic_code: "6411" },
  { cik: "0001726978", ticker: "GSHD", name: "Goosehead Insurance", sector: "Brokers", sub_sector: "Distribution", sic_code: "6411" },
  { cik: "0001781755", ticker: "BRP", name: "Baldwin Insurance Group", sector: "Brokers", sub_sector: "Distribution", sic_code: "6411" },
  // Title (3)
  { cik: "0001331875", ticker: "FNF", name: "Fidelity National Financial", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },
  { cik: "0001472787", ticker: "FAF", name: "First American Financial", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },
  { cik: "0000094344", ticker: "STC", name: "Stewart Information Services", sector: "Title", sub_sector: "Title Insurance", sic_code: "6361" },
  // Mortgage Insurance (4)
  { cik: "0000876437", ticker: "MTG", name: "MGIC Investment", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0000890926", ticker: "RDN", name: "Radian Group", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0001448893", ticker: "ESNT", name: "Essent Group", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
  { cik: "0001547903", ticker: "NMIH", name: "NMI Holdings", sector: "Mortgage Insurance", sub_sector: "Mortgage Insurance", sic_code: "6351" },
];

const XBRL_CONCEPTS = [
  { metric_name: "net_premiums_earned", aliases: ["PremiumsEarnedNet", "NetPremiumsEarned", "PremiumsEarned", "PremiumsEarnedNetPropertyAndCasualty", "SupplementaryInsuranceInformationPremiumRevenue"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "losses_incurred", aliases: ["PolicyholderBenefitsAndClaimsIncurredNet", "IncurredClaimsPropertyCasualtyAndLiability", "LossesAndLossAdjustmentExpense", "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "net_income", aliases: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "stockholders_equity", aliases: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "total_assets", aliases: ["Assets"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "total_liabilities", aliases: ["Liabilities"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "eps", aliases: ["EarningsPerShareDiluted", "EarningsPerShareBasic"], unit_key: "USD/shares", taxonomy: "us-gaap" },
  { metric_name: "shares_outstanding", aliases: ["EntityCommonStockSharesOutstanding"], unit_key: "shares", taxonomy: "dei" },
  { metric_name: "shares_outstanding", aliases: ["CommonStockSharesOutstanding", "WeightedAverageNumberOfShareOutstandingBasicAndDiluted", "WeightedAverageNumberOfSharesOutstandingBasic"], unit_key: "shares", taxonomy: "us-gaap" },
  { metric_name: "investment_income", aliases: ["NetInvestmentIncome", "InvestmentIncomeNet", "InvestmentIncomeInterestAndDividend"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "total_debt", aliases: ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligations", "LongTermDebtNoncurrent", "DebtInstrumentCarryingAmount", "DebtLongtermAndShorttermCombinedAmount", "DebtAndCapitalLeaseObligations", "SeniorLongTermNotes", "UnsecuredDebt", "JuniorSubordinatedNotes", "SeniorNotes", "SubordinatedDebt"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "revenue", aliases: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "HealthCareOrganizationRevenue", "RevenueFromContractWithCustomerIncludingAssessedTax"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "medical_claims_expense", aliases: ["PolicyholderBenefitsAndClaimsIncurredHealthCare", "BenefitExpenseHealthCareOrganizations", "PolicyholderBenefitsAndClaimsIncurredNet", "HealthCareCostsBenefitExpense", "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "acquisition_costs", aliases: ["DeferredPolicyAcquisitionCostAmortizationExpense", "PolicyAcquisitionCosts", "AmortizationOfDeferredPolicyAcquisitionCosts", "SupplementaryInsuranceInformationAmortizationOfDeferredPolicyAcquisitionCosts"], unit_key: "USD", taxonomy: "us-gaap" },
  { metric_name: "underwriting_expenses", aliases: ["UnderwritingExpenses", "OtherUnderwritingExpense", "GeneralAndAdministrativeExpense", "SellingGeneralAndAdministrativeExpense", "SupplementaryInsuranceInformationOtherOperatingExpense"], unit_key: "USD", taxonomy: "us-gaap" },
];

// ------- Helpers -------

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

interface ParsedMetric {
  metric_name: string;
  value: number;
  unit: string;
  period_type: "annual" | "quarterly";
  fiscal_year: number;
  fiscal_quarter: number | null;
  period_start_date: string | null;
  period_end_date: string;
  accession_number: string;
  filed_at: string;
}

function parseFacts(facts: Record<string, unknown>): ParsedMetric[] {
  const metrics: ParsedMetric[] = [];
  const factsObj = (facts as { facts?: Record<string, Record<string, { units: Record<string, XbrlUnit[]> }>> }).facts;
  if (!factsObj) return metrics;

  const minYear = new Date().getFullYear() - 5;

  for (const concept of XBRL_CONCEPTS) {
    const taxonomy = factsObj[concept.taxonomy];
    if (!taxonomy) continue;

    // Merge entries from ALL matching aliases instead of first-match-wins.
    // Earlier aliases win for overlapping periods (preferred tag), but
    // later aliases fill gaps from XBRL tag transitions (e.g. MKL switched
    // from IncurredClaimsP&C to LiabilityForUnpaid... in 2024)
    const deduped = new Map<string, XbrlUnit>();
    for (const alias of concept.aliases) {
      const data = taxonomy[alias];
      if (!data) continue;
      const candidateUnits = data.units[concept.unit_key] ?? Object.values(data.units)[0];
      if (!candidateUnits || candidateUnits.length === 0) continue;

      for (const u of candidateUnits) {
        if (u.form !== "10-K" && u.form !== "10-Q") continue;
        if (u.fy < minYear) continue;
        const key = `${u.form}|${u.start ?? ""}|${u.end}`;
        const existing = deduped.get(key);
        // Add if new period, or replace if strictly later filing (re-filing).
        // For same filing date across aliases, first alias wins (preferred).
        if (!existing || u.filed > existing.filed) {
          deduped.set(key, u);
        }
      }
    }

    if (deduped.size === 0) continue;

    for (const entry of deduped.values()) {
      // For us-gaap: use end date year as the actual fiscal year (not entry.fy
      // which is the filing year and tags all comparative data the same).
      // For DEI: use entry.fy because DEI cover page dates (e.g., 2025-01-31)
      // don't represent the fiscal period end.
      const endYear =
        concept.taxonomy === "dei"
          ? entry.fy
          : parseInt(entry.end.substring(0, 4), 10);
      if (endYear < minYear) continue;

      const isAnnual = entry.form === "10-K";
      let fq: number | null = null;
      if (!isAnnual) {
        fq = entry.fp === "Q1" ? 1 : entry.fp === "Q2" ? 2 : entry.fp === "Q3" ? 3 : entry.fp === "Q4" ? 4 : null;
      }
      metrics.push({
        metric_name: concept.metric_name,
        value: entry.val,
        unit: concept.unit_key === "USD" ? "USD" : concept.unit_key,
        period_type: isAnnual ? "annual" : "quarterly",
        fiscal_year: endYear,
        fiscal_quarter: fq,
        period_start_date: entry.start ?? null,
        period_end_date: entry.end,
        accession_number: entry.accn,
        filed_at: entry.filed,
      });
    }
  }

  return metrics;
}

function computeDerived(raw: ParsedMetric[], fy: number, fq: number | null, pt: "annual" | "quarterly", sector?: string): ParsedMetric[] {
  const lookup: Record<string, number | undefined> = {};
  for (const m of raw) {
    if (m.fiscal_year === fy && m.fiscal_quarter === fq && m.period_type === pt) {
      lookup[m.metric_name] = m.value;
    }
  }

  const derived: ParsedMetric[] = [];
  const base = { period_type: pt, fiscal_year: fy, fiscal_quarter: fq, period_start_date: null, period_end_date: "", accession_number: "derived", filed_at: new Date().toISOString() } as const;

  // Underwriting ratios — P&C, Reinsurance, and Mortgage Insurance
  const uwSectors = ["P&C", "Reinsurance", "Mortgage Insurance"];
  if (!sector || uwSectors.includes(sector)) {
    if (lookup.losses_incurred != null && lookup.net_premiums_earned && lookup.net_premiums_earned !== 0) {
      derived.push({ ...base, metric_name: "loss_ratio", value: (lookup.losses_incurred / lookup.net_premiums_earned) * 100, unit: "percent" });
    }
    const acq = lookup.acquisition_costs ?? 0;
    const uw = lookup.underwriting_expenses ?? 0;
    if ((acq + uw) > 0 && lookup.net_premiums_earned && lookup.net_premiums_earned !== 0) {
      derived.push({ ...base, metric_name: "expense_ratio", value: ((acq + uw) / lookup.net_premiums_earned) * 100, unit: "percent" });
    }
    const lr = derived.find((d) => d.metric_name === "loss_ratio")?.value;
    const er = derived.find((d) => d.metric_name === "expense_ratio")?.value;
    if (lr != null && er != null) {
      derived.push({ ...base, metric_name: "combined_ratio", value: lr + er, unit: "percent" });
    }
  }
  // Universal ratios — skip ROE/D-E when equity <= 0 (negative equity from buybacks distorts, e.g. AON)
  if (lookup.net_income != null && lookup.stockholders_equity && lookup.stockholders_equity > 0) {
    derived.push({ ...base, metric_name: "roe", value: (lookup.net_income / lookup.stockholders_equity) * 100, unit: "percent" });
  }
  if (lookup.net_income != null && lookup.total_assets && lookup.total_assets !== 0) {
    derived.push({ ...base, metric_name: "roa", value: (lookup.net_income / lookup.total_assets) * 100, unit: "percent" });
  }
  // BVPS: skip when equity <= 0 or shares < 1M (Class A only count, e.g. WRB ~285K shares)
  if (lookup.stockholders_equity != null && lookup.stockholders_equity > 0 && lookup.shares_outstanding && lookup.shares_outstanding >= 1_000_000) {
    derived.push({ ...base, metric_name: "book_value_per_share", value: lookup.stockholders_equity / lookup.shares_outstanding, unit: "per_share" });
  }
  if (lookup.total_debt != null && lookup.stockholders_equity && lookup.stockholders_equity > 0) {
    derived.push({ ...base, metric_name: "debt_to_equity", value: lookup.total_debt / lookup.stockholders_equity, unit: "ratio" });
  }
  // Total Liabilities (derived from accounting identity when EDGAR tag missing)
  if (lookup.total_liabilities == null && lookup.total_assets != null && lookup.stockholders_equity != null) {
    derived.push({ ...base, metric_name: "total_liabilities", value: lookup.total_assets - lookup.stockholders_equity, unit: "USD" });
  }
  // Medical Loss Ratio — Health only, use premiums as denominator (not total revenue
  // which includes PBM/pharmacy for diversified health companies like CI, CVS, UNH)
  if (!sector || sector === "Health") {
    const mlrDenominator = lookup.net_premiums_earned ?? lookup.revenue;
    if (lookup.medical_claims_expense != null && mlrDenominator && mlrDenominator !== 0) {
      derived.push({ ...base, metric_name: "medical_loss_ratio", value: (lookup.medical_claims_expense / mlrDenominator) * 100, unit: "percent" });
    }
  }
  return derived;
}

// ------- Main -------

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userAgent = process.env.EDGAR_USER_AGENT || "InsurIntel admin@insurintel.com";

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Step 1: Seed companies
  console.log("Seeding companies...");
  for (const c of COMPANIES_SEED) {
    const { error } = await supabase.from("companies").upsert({
      cik: c.cik,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      sub_sector: c.sub_sector,
      sic_code: c.sic_code,
      is_active: true,
    }, { onConflict: "ticker" });
    if (error) console.error(`  Failed to seed ${c.ticker}: ${error.message}`);
  }
  console.log(`Seeded ${COMPANIES_SEED.length} companies\n`);

  // Step 2: Fetch and ingest data for each company
  const { data: companies } = await supabase.from("companies").select("*").eq("is_active", true).order("ticker");
  if (!companies) {
    console.error("No companies found in database");
    process.exit(1);
  }

  let totalMetrics = 0;
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    console.log(`[${i + 1}/${companies.length}] Processing ${company.ticker} (CIK: ${company.cik})...`);

    try {
      const paddedCik = company.cik.replace(/^0+/, "").padStart(10, "0");
      const res = await rateLimitedFetch(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`,
        userAgent
      );

      if (!res.ok) {
        console.error(`  EDGAR returned ${res.status} for ${company.ticker}`);
        continue;
      }

      const facts = await res.json();
      const rawMetrics = parseFacts(facts);

      if (facts.entityName) {
        await supabase.from("companies").update({ entity_name: facts.entityName }).eq("id", company.id);
      }

      // Compute derived for each period
      const periods = new Set<string>();
      for (const m of rawMetrics) {
        periods.add(`${m.fiscal_year}|${m.fiscal_quarter}|${m.period_type}`);
      }

      const allMetrics = [...rawMetrics];
      for (const key of periods) {
        const [fy, fq, pt] = key.split("|");
        const derived = computeDerived(rawMetrics, Number(fy), fq === "null" ? null : Number(fq), pt as "annual" | "quarterly", company.sector);
        allMetrics.push(...derived);
      }

      // Deduplicate by unique key before upserting
      const dedupMap = new Map<string, typeof allMetrics[0]>();
      for (const metric of allMetrics) {
        const key = `${metric.metric_name}|${metric.period_type}|${metric.fiscal_year}|${metric.fiscal_quarter}`;
        const existing = dedupMap.get(key);
        if (!existing || metric.filed_at >= existing.filed_at) {
          dedupMap.set(key, metric);
        }
      }
      const dedupedMetrics = [...dedupMap.values()];

      // YoY growth — computed AFTER dedup so we use the same values that get stored
      // Only for P&C and Reinsurance (underwriting sectors)
      const premiumGrowthSectors = ["P&C", "Reinsurance", "Mortgage Insurance"];
      if (premiumGrowthSectors.includes(company.sector)) {
        const annualYears = [...new Set(
          dedupedMetrics
            .filter((m) => m.period_type === "annual" && m.metric_name === "net_premiums_earned")
            .map((m) => m.fiscal_year)
        )].sort();
        for (let j = 1; j < annualYears.length; j++) {
          const curr = dedupedMetrics.find((m) => m.metric_name === "net_premiums_earned" && m.fiscal_year === annualYears[j] && m.period_type === "annual");
          const prev = dedupedMetrics.find((m) => m.metric_name === "net_premiums_earned" && m.fiscal_year === annualYears[j - 1] && m.period_type === "annual");
          if (curr && prev && prev.value !== 0) {
            dedupedMetrics.push({
              metric_name: "premium_growth_yoy",
              value: ((curr.value - prev.value) / Math.abs(prev.value)) * 100,
              unit: "percent",
              period_type: "annual",
              fiscal_year: annualYears[j],
              fiscal_quarter: null,
              period_start_date: null,
              period_end_date: curr.period_end_date,
              accession_number: "derived",
              filed_at: new Date().toISOString(),
            });
          }
        }
      }

      // Upsert in batches of 500
      let successCount = 0;
      const rows = dedupedMetrics.map((metric) => ({
        company_id: company.id,
        metric_name: metric.metric_name,
        metric_value: metric.value,
        unit: metric.unit,
        period_type: metric.period_type,
        fiscal_year: metric.fiscal_year,
        fiscal_quarter: metric.fiscal_quarter,
        period_start_date: metric.period_start_date || null,
        period_end_date: metric.period_end_date || null,
        is_derived: metric.accession_number === "derived",
        source: metric.accession_number === "derived" ? "derived" : "edgar",
        accession_number: metric.accession_number === "derived" ? null : metric.accession_number,
        filed_at: metric.filed_at,
      }));

      const BATCH_SIZE = 500;
      for (let b = 0; b < rows.length; b += BATCH_SIZE) {
        const batch = rows.slice(b, b + BATCH_SIZE);
        const { error } = await supabase.from("financial_metrics").upsert(batch, { onConflict: "company_id,metric_name,period_type,fiscal_year,fiscal_quarter" });
        if (!error) successCount += batch.length;
        else console.error(`  Batch error: ${error.message}`);
      }

      await supabase.from("companies").update({ last_ingested_at: new Date().toISOString() }).eq("id", company.id);

      totalMetrics += successCount;
      console.log(`  -> ${successCount}/${allMetrics.length} metrics stored (${rawMetrics.length} raw + ${allMetrics.length - rawMetrics.length} derived)`);
    } catch (err) {
      console.error(`  Error processing ${company.ticker}:`, err instanceof Error ? err.message : err);
    }
  }

  // Step 3: Refresh materialized views
  console.log("\nRefreshing materialized views...");
  const { error: rpcError } = await supabase.rpc("refresh_all_materialized_views");
  if (rpcError) {
    console.error("Failed to refresh views:", rpcError.message);
  } else {
    console.log("Views refreshed successfully");
  }

  console.log(`\nDone! Total metrics stored: ${totalMetrics}`);
}

main().catch(console.error);
