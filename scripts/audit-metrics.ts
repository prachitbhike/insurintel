/**
 * Comprehensive Financial Metrics Audit Script
 *
 * Run with:
 *   NEXT_PUBLIC_SUPABASE_URL='...' SUPABASE_SERVICE_ROLE_KEY='...' npx tsx scripts/audit-metrics.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "N/A";
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(decimals)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(decimals)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(decimals)}K`;
  return `$${v.toFixed(decimals)}`;
}

function pct(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `${v.toFixed(2)}%`;
}

function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface LatestMetric {
  company_id: string;
  ticker: string;
  name: string;
  sector: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  fiscal_year: number;
}

interface RawMetric {
  id: string;
  company_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  period_type: string;
  fiscal_year: number;
  fiscal_quarter: number | null;
  is_derived: boolean;
  source: string;
}

interface CompanyRow {
  id: string;
  ticker: string;
  name: string;
  sector: string;
}

const ISSUES: string[] = [];

function flag(issue: string) {
  ISSUES.push(issue);
  console.log(`  ⚠ FLAG: ${issue}`);
}

// ──────────────────────────────────────────────
// Data fetchers (paginated to handle >1000 rows)
// ──────────────────────────────────────────────
async function fetchAllLatestMetrics(): Promise<LatestMetric[]> {
  const all: LatestMetric[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("mv_latest_metrics")
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function fetchAllRawMetrics(): Promise<RawMetric[]> {
  const all: RawMetric[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("financial_metrics")
      .select("id, company_id, metric_name, metric_value, unit, period_type, fiscal_year, fiscal_quarter, is_derived, source")
      .eq("period_type", "annual")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function fetchCompanies(): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, ticker, name, sector");
  if (error) throw error;
  return data ?? [];
}

// ──────────────────────────────────────────────
// Main Audit
// ──────────────────────────────────────────────
async function audit() {
  console.log("=".repeat(100));
  console.log("  INSURINTEL FINANCIAL METRICS AUDIT");
  console.log("  Run at:", new Date().toISOString());
  console.log("=".repeat(100));

  // Fetch all data
  console.log("\nFetching data...");
  const companies = await fetchCompanies();
  console.log(`  Companies: ${companies.length}`);

  const latestMetrics = await fetchAllLatestMetrics();
  console.log(`  Latest metrics (mv_latest_metrics): ${latestMetrics.length}`);

  const rawMetrics = await fetchAllRawMetrics();
  console.log(`  Raw annual metrics (financial_metrics): ${rawMetrics.length}`);

  // Build lookup maps
  const companyById = new Map<string, CompanyRow>();
  for (const c of companies) companyById.set(c.id, c);

  const bySector = new Map<string, CompanyRow[]>();
  for (const c of companies) {
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector)!.push(c);
  }

  // Build latest metric lookup: ticker -> metric_name -> LatestMetric
  const latestByTicker = new Map<string, Map<string, LatestMetric>>();
  for (const m of latestMetrics) {
    if (!latestByTicker.has(m.ticker)) latestByTicker.set(m.ticker, new Map());
    latestByTicker.get(m.ticker)!.set(m.metric_name, m);
  }

  // Build raw metric lookup: company_id -> fiscal_year -> metric_name -> RawMetric
  const rawByCompanyYearMetric = new Map<string, Map<number, Map<string, RawMetric>>>();
  for (const m of rawMetrics) {
    if (!rawByCompanyYearMetric.has(m.company_id)) rawByCompanyYearMetric.set(m.company_id, new Map());
    const yearMap = rawByCompanyYearMetric.get(m.company_id)!;
    if (!yearMap.has(m.fiscal_year)) yearMap.set(m.fiscal_year, new Map());
    yearMap.get(m.fiscal_year)!.set(m.metric_name, m);
  }

  // ═══════════════════════════════════════════
  // SECTION 1: Sanity Check Metric Values by Sector
  // ═══════════════════════════════════════════
  console.log("\n" + "=".repeat(100));
  console.log("  SECTION 1: SANITY CHECK METRIC VALUES BY SECTOR");
  console.log("=".repeat(100));

  const KEY_METRICS_BY_SECTOR: Record<string, string[]> = {
    "P&C": ["total_assets", "net_income", "net_premiums_earned", "loss_ratio", "combined_ratio", "roe", "stockholders_equity"],
    "Life": ["total_assets", "net_income", "stockholders_equity", "roe", "revenue", "investment_income"],
    "Health": ["total_assets", "net_income", "revenue", "medical_loss_ratio", "roe", "stockholders_equity"],
    "Reinsurance": ["total_assets", "net_income", "net_premiums_earned", "loss_ratio", "combined_ratio", "roe"],
    "Brokers": ["total_assets", "net_income", "revenue", "roe", "stockholders_equity"],
  };

  for (const [sector, sectorCompanies] of bySector) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`  SECTOR: ${sector} (${sectorCompanies.length} companies)`);
    console.log(`${"─".repeat(80)}`);

    const keyMetrics = KEY_METRICS_BY_SECTOR[sector] ?? [];

    for (const company of sectorCompanies.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
      const metricsMap = latestByTicker.get(company.ticker);
      if (!metricsMap) {
        flag(`${company.ticker} (${company.name}) [${sector}]: NO METRICS FOUND AT ALL`);
        continue;
      }

      console.log(`\n  ${company.ticker} - ${company.name}`);
      for (const mn of keyMetrics) {
        const m = metricsMap.get(mn);
        if (!m) {
          console.log(`    ${mn.padEnd(25)} MISSING`);
          if (["total_assets", "net_income", "roe"].includes(mn)) {
            flag(`${company.ticker} [${sector}]: Missing key metric '${mn}'`);
          }
          continue;
        }

        let display = "";
        if (m.unit === "percent" || mn.endsWith("_ratio") || mn === "roe" || mn === "roa") {
          display = pct(m.metric_value);
        } else if (m.unit === "USD" || m.unit === "usd") {
          display = fmt(m.metric_value);
        } else {
          display = `${m.metric_value.toFixed(2)} (${m.unit})`;
        }
        console.log(`    ${mn.padEnd(25)} ${display.padEnd(20)} (FY${m.fiscal_year})`);

        // Sanity checks
        if (mn === "total_assets") {
          if (sector !== "Brokers" && Math.abs(m.metric_value) < 1e9) {
            flag(`${company.ticker} [${sector}]: total_assets=${fmt(m.metric_value)} - TOO SMALL, expected billions for insurer`);
          }
          if (m.metric_value <= 0) {
            flag(`${company.ticker} [${sector}]: total_assets is zero or negative: ${fmt(m.metric_value)}`);
          }
        }

        if (mn === "net_income" && m.metric_value === 0) {
          flag(`${company.ticker} [${sector}]: net_income is exactly 0 - suspicious`);
        }

        if (mn === "loss_ratio") {
          if (sector === "P&C" && (m.metric_value < 40 || m.metric_value > 120)) {
            flag(`${company.ticker} [${sector}]: loss_ratio=${pct(m.metric_value)} - outside expected 40-120% range`);
          }
        }

        if (mn === "combined_ratio") {
          if ((sector === "P&C" || sector === "Reinsurance") && (m.metric_value < 85 || m.metric_value > 115)) {
            flag(`${company.ticker} [${sector}]: combined_ratio=${pct(m.metric_value)} - outside expected 85-115% range`);
          }
        }

        if (mn === "roe") {
          if (m.metric_value < -50 || m.metric_value > 100) {
            flag(`${company.ticker} [${sector}]: roe=${pct(m.metric_value)} - extreme value`);
          } else if (m.metric_value < 0) {
            flag(`${company.ticker} [${sector}]: roe=${pct(m.metric_value)} - negative ROE`);
          } else if (m.metric_value > 25 && sector !== "Brokers") {
            flag(`${company.ticker} [${sector}]: roe=${pct(m.metric_value)} - unusually high for insurer (>25%)`);
          }
        }

        if (mn === "medical_loss_ratio" && sector === "Health") {
          if (m.metric_value < 70 || m.metric_value > 95) {
            flag(`${company.ticker} [${sector}]: medical_loss_ratio=${pct(m.metric_value)} - outside expected 70-95% range`);
          }
        }
      }

      // Check for metrics that shouldn't exist for Brokers
      if (sector === "Brokers") {
        const badMetrics = ["loss_ratio", "combined_ratio", "net_premiums_earned"];
        for (const bm of badMetrics) {
          const m = metricsMap.get(bm);
          if (m && m.metric_value !== 0) {
            flag(`${company.ticker} [Brokers]: Has ${bm}=${m.unit === "percent" ? pct(m.metric_value) : fmt(m.metric_value)} - BROKERS SHOULD NOT HAVE THIS`);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 2: Cross-Company Comparability (Outlier Detection)
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION 2: CROSS-COMPANY COMPARABILITY (OUTLIER DETECTION)");
  console.log("=".repeat(100));

  const COMPARISONS: Record<string, string[]> = {
    "P&C": ["loss_ratio", "combined_ratio", "net_premiums_earned", "roe"],
    "Life": ["net_income", "total_assets", "roe"],
    "Health": ["revenue", "medical_loss_ratio", "net_income"],
    "Reinsurance": ["loss_ratio", "combined_ratio", "roe"],
    "Brokers": ["revenue", "net_income", "roe"],
  };

  for (const [sector, metrics] of Object.entries(COMPARISONS)) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`  SECTOR: ${sector} - Cross-Company Comparison`);
    console.log(`${"─".repeat(80)}`);

    const sectorCompanies = bySector.get(sector) ?? [];

    for (const metricName of metrics) {
      const values: { ticker: string; value: number }[] = [];
      for (const c of sectorCompanies) {
        const m = latestByTicker.get(c.ticker)?.get(metricName);
        if (m) values.push({ ticker: c.ticker, value: m.metric_value });
      }

      if (values.length < 2) {
        console.log(`\n  ${metricName}: Only ${values.length} companies have this metric - skipping comparison`);
        continue;
      }

      const vals = values.map((v) => v.value);
      const m = mean(vals);
      const sd = stddev(vals);

      const isPercent = ["loss_ratio", "combined_ratio", "roe", "medical_loss_ratio"].includes(metricName);

      console.log(`\n  ${metricName}:`);
      console.log(`    Mean: ${isPercent ? pct(m) : fmt(m)}  |  StdDev: ${isPercent ? pct(sd) : fmt(sd)}  |  N=${values.length}`);

      // Sort by value
      values.sort((a, b) => b.value - a.value);
      for (const v of values) {
        const zscore = sd > 0 ? (v.value - m) / sd : 0;
        const outlierMark = Math.abs(zscore) > 2 ? " *** OUTLIER (>2 SD) ***" : "";
        const display = isPercent ? pct(v.value) : fmt(v.value);
        console.log(`    ${v.ticker.padEnd(8)} ${display.padEnd(20)} z-score: ${zscore.toFixed(2)}${outlierMark}`);
        if (Math.abs(zscore) > 2) {
          flag(`${v.ticker} [${sector}]: ${metricName}=${display} is >2 SD from sector mean (z=${zscore.toFixed(2)})`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 3: Metric Misattribution Checks
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION 3: METRIC MISATTRIBUTION CHECKS");
  console.log("=".repeat(100));

  // 3a. Brokers with loss_ratio or combined_ratio
  console.log("\n  3a. Brokers with loss_ratio or combined_ratio:");
  const brokers = bySector.get("Brokers") ?? [];
  let brokerIssueFound = false;
  for (const b of brokers) {
    const metricsMap = latestByTicker.get(b.ticker);
    if (!metricsMap) continue;
    for (const badMetric of ["loss_ratio", "combined_ratio", "net_premiums_earned", "losses_incurred"]) {
      const m = metricsMap.get(badMetric);
      if (m) {
        const display = m.unit === "percent" ? pct(m.metric_value) : fmt(m.metric_value);
        console.log(`    ${b.ticker}: HAS ${badMetric} = ${display}`);
        flag(`MISATTRIBUTION: ${b.ticker} [Brokers] has ${badMetric}=${display}`);
        brokerIssueFound = true;
      }
    }
  }
  if (!brokerIssueFound) console.log("    PASS - No brokers have insurance-specific underwriting metrics");

  // 3b. Health companies with net_premiums_earned
  console.log("\n  3b. Health companies with net_premiums_earned:");
  const healthCos = bySector.get("Health") ?? [];
  for (const h of healthCos) {
    const metricsMap = latestByTicker.get(h.ticker);
    if (!metricsMap) continue;
    const m = metricsMap.get("net_premiums_earned");
    if (m) {
      console.log(`    ${h.ticker}: HAS net_premiums_earned = ${fmt(m.metric_value)}`);
      flag(`${h.ticker} [Health]: Has net_premiums_earned=${fmt(m.metric_value)} - review if appropriate`);
    }
  }

  // 3c. Revenue vs net_premiums_earned for P&C
  console.log("\n  3c. Revenue vs net_premiums_earned for P&C companies:");
  const pcCompanies = bySector.get("P&C") ?? [];
  for (const c of pcCompanies) {
    const metricsMap = latestByTicker.get(c.ticker);
    if (!metricsMap) continue;
    const rev = metricsMap.get("revenue");
    const npe = metricsMap.get("net_premiums_earned");
    if (rev && npe) {
      const diff = Math.abs(rev.metric_value - npe.metric_value);
      const pctDiff = npe.metric_value !== 0 ? (diff / Math.abs(npe.metric_value)) * 100 : 0;
      const same = pctDiff < 1;
      console.log(`    ${c.ticker.padEnd(8)} Revenue=${fmt(rev.metric_value).padEnd(14)} NPE=${fmt(npe.metric_value).padEnd(14)} Diff=${pctDiff.toFixed(1)}% ${same ? "*** SAME VALUE - POSSIBLE ALIAS COLLISION ***" : "OK (different)"}`);
      if (same) {
        flag(`${c.ticker} [P&C]: revenue and net_premiums_earned are nearly identical (diff=${pctDiff.toFixed(1)}%) - possible XBRL alias collision (PremiumsEarnedNet is alias for both)`);
      }
    } else if (!rev && npe) {
      console.log(`    ${c.ticker.padEnd(8)} Revenue=MISSING    NPE=${fmt(npe.metric_value)}`);
    } else if (rev && !npe) {
      console.log(`    ${c.ticker.padEnd(8)} Revenue=${fmt(rev.metric_value).padEnd(14)} NPE=MISSING`);
      flag(`${c.ticker} [P&C]: Missing net_premiums_earned (has revenue only)`);
    } else {
      console.log(`    ${c.ticker.padEnd(8)} Revenue=MISSING    NPE=MISSING`);
      flag(`${c.ticker} [P&C]: Missing both revenue and net_premiums_earned`);
    }
  }

  // 3d. Companies where losses_incurred > net_premiums_earned
  console.log("\n  3d. Companies where losses_incurred > net_premiums_earned:");
  for (const [sector, sectorCos] of bySector) {
    for (const c of sectorCos) {
      const metricsMap = latestByTicker.get(c.ticker);
      if (!metricsMap) continue;
      const li = metricsMap.get("losses_incurred");
      const npe = metricsMap.get("net_premiums_earned");
      if (li && npe && li.metric_value > npe.metric_value) {
        const impliedLR = (li.metric_value / npe.metric_value) * 100;
        console.log(`    ${c.ticker} [${sector}]: losses_incurred (${fmt(li.metric_value)}) > net_premiums_earned (${fmt(npe.metric_value)}) => implied loss_ratio=${pct(impliedLR)}`);
        flag(`${c.ticker} [${sector}]: losses_incurred > net_premiums_earned (implied LR=${pct(impliedLR)})`);
      }
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 4: Year Coverage
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION 4: YEAR COVERAGE");
  console.log("=".repeat(100));

  // Group raw metrics by company_id -> set of fiscal_years
  const yearsByCompany = new Map<string, Set<number>>();
  for (const m of rawMetrics) {
    if (!yearsByCompany.has(m.company_id)) yearsByCompany.set(m.company_id, new Set());
    yearsByCompany.get(m.company_id)!.add(m.fiscal_year);
  }

  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear - 2, currentYear - 1, currentYear]; // 2024, 2025, 2026

  console.log(`\n  Checking for years: ${recentYears.join(", ")} (and showing all available years)`);
  console.log(`  Note: FY2025 annual reports may not all be filed yet. FY2026 is current year.\n`);

  for (const [sector, sectorCos] of bySector) {
    console.log(`\n  ${sector}:`);
    for (const c of sectorCos.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
      const years = yearsByCompany.get(c.id);
      if (!years) {
        console.log(`    ${c.ticker.padEnd(8)} NO DATA`);
        flag(`${c.ticker} [${sector}]: No annual financial data at all`);
        continue;
      }
      const sortedYears = [...years].sort();
      const missing = recentYears.filter((y) => !years.has(y));

      let missingNote = "";
      if (missing.length > 0) {
        // Only flag missing 2023 and 2024 (2025 filings may still be coming)
        const criticalMissing = missing.filter((y) => y <= currentYear - 1);
        if (criticalMissing.length > 0) {
          missingNote = ` *** MISSING: ${criticalMissing.join(", ")} ***`;
          flag(`${c.ticker} [${sector}]: Missing annual data for fiscal years: ${criticalMissing.join(", ")}`);
        } else {
          missingNote = ` (missing ${missing.join(", ")} - may not be filed yet)`;
        }
      }

      console.log(`    ${c.ticker.padEnd(8)} Years: ${sortedYears.join(", ")}${missingNote}`);
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 5: Derived Metric Validation
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION 5: DERIVED METRIC VALIDATION");
  console.log("=".repeat(100));

  // Helper: get a specific raw metric for a company/year
  function getRawMetric(companyId: string, year: number, metricName: string): number | undefined {
    return rawByCompanyYearMetric.get(companyId)?.get(year)?.get(metricName)?.metric_value;
  }

  function getCompanyByTicker(ticker: string): CompanyRow | undefined {
    return companies.find((c) => c.ticker === ticker);
  }

  // 5a. Loss ratio validation for 3 P&C companies
  console.log("\n  5a. Loss Ratio Validation (loss_ratio = losses_incurred / net_premiums_earned * 100):");
  const pcSample = ["CB", "PGR", "TRV"];
  for (const ticker of pcSample) {
    const co = getCompanyByTicker(ticker);
    if (!co) { console.log(`    ${ticker}: NOT FOUND`); continue; }
    const metricsMap = latestByTicker.get(ticker);
    if (!metricsMap) { console.log(`    ${ticker}: NO METRICS`); continue; }

    const lr = metricsMap.get("loss_ratio");
    const lrYear = lr?.fiscal_year;
    if (!lrYear) { console.log(`    ${ticker}: No loss_ratio metric`); continue; }

    const li = getRawMetric(co.id, lrYear, "losses_incurred");
    const npe = getRawMetric(co.id, lrYear, "net_premiums_earned");
    const storedLR = lr?.metric_value;

    if (li != null && npe != null && npe !== 0) {
      const calculatedLR = (li / npe) * 100;
      const diff = Math.abs(calculatedLR - (storedLR ?? 0));
      const match = diff < 0.5;
      console.log(`    ${ticker} (FY${lrYear}):`);
      console.log(`      losses_incurred     = ${fmt(li)}`);
      console.log(`      net_premiums_earned  = ${fmt(npe)}`);
      console.log(`      Calculated LR        = ${pct(calculatedLR)}`);
      console.log(`      Stored LR            = ${pct(storedLR)}`);
      console.log(`      Difference           = ${diff.toFixed(4)}pp  ${match ? "PASS" : "*** MISMATCH ***"}`);
      if (!match) {
        flag(`${ticker}: loss_ratio MISMATCH - calculated=${pct(calculatedLR)}, stored=${pct(storedLR)}, diff=${diff.toFixed(4)}pp`);
      }
    } else {
      console.log(`    ${ticker} (FY${lrYear}): Cannot validate - losses_incurred=${li != null ? fmt(li) : "MISSING"}, net_premiums_earned=${npe != null ? fmt(npe) : "MISSING"}`);
      flag(`${ticker}: Cannot validate loss_ratio - missing raw inputs`);
    }
  }

  // 5b. ROE validation for 3 companies
  console.log("\n  5b. ROE Validation (roe = net_income / stockholders_equity * 100):");
  const roeSample = ["CB", "MET", "UNH"];
  for (const ticker of roeSample) {
    const co = getCompanyByTicker(ticker);
    if (!co) { console.log(`    ${ticker}: NOT FOUND`); continue; }
    const metricsMap = latestByTicker.get(ticker);
    if (!metricsMap) { console.log(`    ${ticker}: NO METRICS`); continue; }

    const roeMetric = metricsMap.get("roe");
    const roeYear = roeMetric?.fiscal_year;
    if (!roeYear) { console.log(`    ${ticker}: No roe metric`); continue; }

    const ni = getRawMetric(co.id, roeYear, "net_income");
    const eq = getRawMetric(co.id, roeYear, "stockholders_equity");
    const storedROE = roeMetric?.metric_value;

    if (ni != null && eq != null && eq !== 0) {
      const calculatedROE = (ni / eq) * 100;
      const diff = Math.abs(calculatedROE - (storedROE ?? 0));
      const match = diff < 0.5;
      console.log(`    ${ticker} (FY${roeYear}):`);
      console.log(`      net_income           = ${fmt(ni)}`);
      console.log(`      stockholders_equity   = ${fmt(eq)}`);
      console.log(`      Calculated ROE        = ${pct(calculatedROE)}`);
      console.log(`      Stored ROE            = ${pct(storedROE)}`);
      console.log(`      Difference           = ${diff.toFixed(4)}pp  ${match ? "PASS" : "*** MISMATCH ***"}`);
      if (!match) {
        flag(`${ticker}: ROE MISMATCH - calculated=${pct(calculatedROE)}, stored=${pct(storedROE)}, diff=${diff.toFixed(4)}pp`);
      }
    } else {
      console.log(`    ${ticker} (FY${roeYear}): Cannot validate - net_income=${ni != null ? fmt(ni) : "MISSING"}, stockholders_equity=${eq != null ? fmt(eq) : "MISSING"}`);
      flag(`${ticker}: Cannot validate ROE - missing raw inputs`);
    }
  }

  // 5c. Medical Loss Ratio for 2 Health companies
  console.log("\n  5c. Medical Loss Ratio Validation (MLR = medical_claims_expense / revenue * 100):");
  const mlrSample = ["UNH", "ELV"];
  for (const ticker of mlrSample) {
    const co = getCompanyByTicker(ticker);
    if (!co) { console.log(`    ${ticker}: NOT FOUND`); continue; }
    const metricsMap = latestByTicker.get(ticker);
    if (!metricsMap) { console.log(`    ${ticker}: NO METRICS`); continue; }

    const mlr = metricsMap.get("medical_loss_ratio");
    const mlrYear = mlr?.fiscal_year;
    if (!mlrYear) { console.log(`    ${ticker}: No medical_loss_ratio metric`); continue; }

    const mce = getRawMetric(co.id, mlrYear, "medical_claims_expense");
    const rev = getRawMetric(co.id, mlrYear, "revenue");
    const storedMLR = mlr?.metric_value;

    if (mce != null && rev != null && rev !== 0) {
      const calculatedMLR = (mce / rev) * 100;
      const diff = Math.abs(calculatedMLR - (storedMLR ?? 0));
      const match = diff < 0.5;
      console.log(`    ${ticker} (FY${mlrYear}):`);
      console.log(`      medical_claims_expense = ${fmt(mce)}`);
      console.log(`      revenue                = ${fmt(rev)}`);
      console.log(`      Calculated MLR          = ${pct(calculatedMLR)}`);
      console.log(`      Stored MLR              = ${pct(storedMLR)}`);
      console.log(`      Difference              = ${diff.toFixed(4)}pp  ${match ? "PASS" : "*** MISMATCH ***"}`);
      if (!match) {
        flag(`${ticker}: MLR MISMATCH - calculated=${pct(calculatedMLR)}, stored=${pct(storedMLR)}, diff=${diff.toFixed(4)}pp`);
      }
    } else {
      console.log(`    ${ticker} (FY${mlrYear}): Cannot validate - medical_claims_expense=${mce != null ? fmt(mce) : "MISSING"}, revenue=${rev != null ? fmt(rev) : "MISSING"}`);
      flag(`${ticker}: Cannot validate MLR - missing raw inputs`);
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 6: Summary of All Available Metrics per Company
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  SECTION 6: METRIC COVERAGE SUMMARY");
  console.log("=".repeat(100));

  const allMetricNames = new Set<string>();
  for (const m of latestMetrics) allMetricNames.add(m.metric_name);
  const sortedMetricNames = [...allMetricNames].sort();

  console.log(`\n  All metric names in database: ${sortedMetricNames.join(", ")}`);
  console.log(`  Total distinct metrics: ${sortedMetricNames.length}\n`);

  for (const [sector, sectorCos] of bySector) {
    console.log(`\n  ${sector}:`);
    for (const c of sectorCos.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
      const metricsMap = latestByTicker.get(c.ticker);
      const count = metricsMap ? metricsMap.size : 0;
      const metricNames = metricsMap ? [...metricsMap.keys()].sort().join(", ") : "none";
      console.log(`    ${c.ticker.padEnd(8)} (${count} metrics): ${metricNames}`);
    }
  }

  // ═══════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════
  console.log("\n\n" + "=".repeat(100));
  console.log("  FINAL AUDIT SUMMARY");
  console.log("=".repeat(100));
  console.log(`\n  Total companies: ${companies.length}`);
  console.log(`  Total latest metrics: ${latestMetrics.length}`);
  console.log(`  Total raw annual metrics: ${rawMetrics.length}`);
  console.log(`  Total issues flagged: ${ISSUES.length}`);

  if (ISSUES.length > 0) {
    console.log(`\n  ALL FLAGGED ISSUES:`);
    for (let i = 0; i < ISSUES.length; i++) {
      console.log(`    ${(i + 1).toString().padStart(3)}. ${ISSUES[i]}`);
    }
  } else {
    console.log("\n  No issues found!");
  }

  console.log("\n" + "=".repeat(100));
  console.log("  AUDIT COMPLETE");
  console.log("=".repeat(100));
}

audit().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
