/**
 * InsurIntel - Comprehensive Financial Metrics Audit
 *
 * Checks:
 *   1. Missing key metrics per sector
 *   2. Value sanity checks with specific thresholds
 *   3. Year-over-year consistency (>50% change flagged)
 *   4. Cross-metric consistency (accounting identities)
 *   5. Fiscal year freshness
 *   6. Derived metric verification for 5 P&C companies
 *
 * Run: npx tsx scripts/audit-metrics.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

// ========== Types ==========
interface Finding {
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  company?: string;
  sector?: string;
  metric?: string;
  message: string;
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
  period_type: string;
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
  is_active: boolean;
}

// ========== Expected metrics per sector ==========
const SECTOR_EXPECTED: Record<string, string[]> = {
  "P&C": ["total_assets", "net_income", "stockholders_equity", "net_premiums_earned", "losses_incurred", "loss_ratio", "combined_ratio", "roe", "roa", "eps"],
  "Life": ["total_assets", "net_income", "stockholders_equity", "roe", "roa", "eps", "investment_income"],
  "Health": ["total_assets", "net_income", "revenue", "roe", "roa", "eps", "medical_claims_expense", "medical_loss_ratio"],
  "Reinsurance": ["total_assets", "net_income", "stockholders_equity", "net_premiums_earned", "loss_ratio", "combined_ratio", "roe", "roa"],
  "Brokers": ["total_assets", "net_income", "revenue", "roe", "roa", "eps"],
};

const findings: Finding[] = [];

function addFinding(severity: Finding["severity"], category: string, message: string, company?: string, sector?: string, metric?: string) {
  findings.push({ severity, category, company, sector, metric, message });
}

function fmtUSD(val: number): string {
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function fmtPct(val: number): string {
  return `${val.toFixed(2)}%`;
}

// ========== Paginated fetchers ==========
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

// ========== MAIN ==========
async function main() {
  console.log("=".repeat(100));
  console.log("  INSURINTEL COMPREHENSIVE FINANCIAL METRICS AUDIT");
  console.log(`  Run at: ${new Date().toISOString()}`);
  console.log("=".repeat(100));

  // ── Fetch all data ──
  console.log("\nFetching data...");
  const companies = await fetchAll<CompanyRow>("companies", "id, ticker, name, sector, is_active");
  console.log(`  Companies: ${companies.length}`);

  const latestMetrics = await fetchAll<LatestMetric>("mv_latest_metrics", "*");
  console.log(`  Latest metrics (mv_latest_metrics): ${latestMetrics.length}`);

  const rawMetrics = await fetchAll<RawMetric>("financial_metrics", "id, company_id, metric_name, metric_value, unit, period_type, fiscal_year, fiscal_quarter, is_derived, source", { period_type: "annual" });
  console.log(`  Raw annual metrics (financial_metrics): ${rawMetrics.length}`);

  // ── Build lookups ──
  const companyByTicker = new Map<string, CompanyRow>();
  const companyById = new Map<string, CompanyRow>();
  for (const c of companies) {
    companyByTicker.set(c.ticker, c);
    companyById.set(c.id, c);
  }

  // latest: ticker -> metric_name -> LatestMetric
  const latestByTicker = new Map<string, Map<string, LatestMetric>>();
  for (const m of latestMetrics) {
    if (!latestByTicker.has(m.ticker)) latestByTicker.set(m.ticker, new Map());
    latestByTicker.get(m.ticker)!.set(m.metric_name, m);
  }

  // raw: company_id -> fiscal_year -> metric_name -> RawMetric
  const rawLookup = new Map<string, Map<number, Map<string, RawMetric>>>();
  for (const m of rawMetrics) {
    if (!rawLookup.has(m.company_id)) rawLookup.set(m.company_id, new Map());
    const yearMap = rawLookup.get(m.company_id)!;
    if (!yearMap.has(m.fiscal_year)) yearMap.set(m.fiscal_year, new Map());
    yearMap.get(m.fiscal_year)!.set(m.metric_name, m);
  }

  // raw timeseries: ticker -> metric_name -> [{year, value}]
  const timeseries = new Map<string, Map<string, { year: number; value: number }[]>>();
  for (const m of rawMetrics) {
    const co = companyById.get(m.company_id);
    if (!co) continue;
    const ticker = co.ticker;
    if (!timeseries.has(ticker)) timeseries.set(ticker, new Map());
    const metricMap = timeseries.get(ticker)!;
    if (!metricMap.has(m.metric_name)) metricMap.set(m.metric_name, []);
    metricMap.get(m.metric_name)!.push({ year: m.fiscal_year, value: m.metric_value });
  }

  // Sector grouping
  const bySector = new Map<string, CompanyRow[]>();
  for (const c of companies) {
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector)!.push(c);
  }

  // Overview
  const uniqueTickers = new Set(latestMetrics.map(r => r.ticker));
  const uniqueMetricNames = [...new Set(latestMetrics.map(r => r.metric_name))].sort();
  console.log(`\n  Companies with data: ${uniqueTickers.size}/${companies.length}`);
  console.log(`  Distinct metric names: ${uniqueMetricNames.length}`);
  console.log(`  Metrics: ${uniqueMetricNames.join(", ")}`);
  console.log("\n  Sector breakdown:");
  for (const [sector, cos] of bySector) {
    const withData = cos.filter(c => latestByTicker.has(c.ticker)).length;
    console.log(`    ${sector}: ${cos.length} companies (${withData} with data)`);
  }

  // =====================================================================
  // CHECK 1: MISSING KEY METRICS PER SECTOR
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 1: MISSING KEY METRICS PER SECTOR");
  console.log("=".repeat(100));

  for (const [sector, expectedMetrics] of Object.entries(SECTOR_EXPECTED)) {
    const sectorCos = (bySector.get(sector) || []).sort((a, b) => a.ticker.localeCompare(b.ticker));
    console.log(`\n  --- ${sector} (${sectorCos.length} companies, expected: ${expectedMetrics.join(", ")}) ---`);

    for (const co of sectorCos) {
      const metricsMap = latestByTicker.get(co.ticker);
      const have = metricsMap ? [...metricsMap.keys()] : [];
      const missing = expectedMetrics.filter(m => !have.includes(m));

      if (missing.length === 0) {
        console.log(`    ${co.ticker.padEnd(8)} ${co.name.padEnd(35)} ALL ${expectedMetrics.length} present`);
      } else {
        const severity: Finding["severity"] = missing.length >= 5 ? "CRITICAL" : missing.length >= 3 ? "WARNING" : "INFO";
        console.log(`    ${co.ticker.padEnd(8)} ${co.name.padEnd(35)} MISSING ${missing.length}/${expectedMetrics.length}: ${missing.join(", ")}`);
        addFinding(severity, "Missing Metrics", `Missing ${missing.length}/${expectedMetrics.length} expected metrics: ${missing.join(", ")}`, co.ticker, sector);
      }
    }
  }

  // =====================================================================
  // CHECK 2: VALUE SANITY CHECKS
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 2: VALUE SANITY CHECKS");
  console.log("=".repeat(100));

  for (const co of [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    const metricsMap = latestByTicker.get(co.ticker);
    if (!metricsMap) continue;

    const m: Record<string, number> = {};
    for (const [name, row] of metricsMap) m[name] = row.metric_value;

    const issues: string[] = [];

    // total_assets > $1B
    if (m.total_assets !== undefined && m.total_assets < 1e9) {
      issues.push(`total_assets=${fmtUSD(m.total_assets)} < $1B`);
      addFinding("WARNING", "Value Sanity", `total_assets ${fmtUSD(m.total_assets)} below $1B threshold`, co.ticker, co.sector, "total_assets");
    }

    // net_income: |val| > 50% of total_assets
    if (m.net_income !== undefined && m.total_assets !== undefined && m.total_assets > 0) {
      const ratio = Math.abs(m.net_income) / m.total_assets;
      if (ratio > 0.5) {
        issues.push(`|net_income|/total_assets=${(ratio * 100).toFixed(1)}% (>50%)`);
        addFinding("CRITICAL", "Value Sanity", `|net_income| (${fmtUSD(m.net_income)}) is ${(ratio * 100).toFixed(1)}% of total_assets (${fmtUSD(m.total_assets)})`, co.ticker, co.sector, "net_income");
      }
    }

    // stockholders_equity negative
    if (m.stockholders_equity !== undefined && m.stockholders_equity < 0) {
      issues.push(`stockholders_equity=${fmtUSD(m.stockholders_equity)} NEGATIVE`);
      addFinding("WARNING", "Value Sanity", `Negative stockholders_equity: ${fmtUSD(m.stockholders_equity)}`, co.ticker, co.sector, "stockholders_equity");
    }

    // ROE: outside -50% to +50%
    if (m.roe !== undefined && (m.roe < -50 || m.roe > 50)) {
      issues.push(`roe=${fmtPct(m.roe)} outside [-50, +50]`);
      addFinding("WARNING", "Value Sanity", `ROE ${fmtPct(m.roe)} outside expected -50% to +50% range`, co.ticker, co.sector, "roe");
    }

    // ROA: outside -5% to +10%
    if (m.roa !== undefined && (m.roa < -5 || m.roa > 10)) {
      issues.push(`roa=${fmtPct(m.roa)} outside [-5, +10]`);
      addFinding("WARNING", "Value Sanity", `ROA ${fmtPct(m.roa)} outside expected -5% to +10% range`, co.ticker, co.sector, "roa");
    }

    // EPS: outside -20 to 200
    if (m.eps !== undefined && (m.eps < -20 || m.eps > 200)) {
      issues.push(`eps=${m.eps.toFixed(2)} outside [-20, 200]`);
      addFinding("WARNING", "Value Sanity", `EPS $${m.eps.toFixed(2)} outside expected -$20 to $200 range`, co.ticker, co.sector, "eps");
    }

    // loss_ratio (P&C/Re): 40-100%
    if ((co.sector === "P&C" || co.sector === "Reinsurance") && m.loss_ratio !== undefined) {
      if (m.loss_ratio < 40 || m.loss_ratio > 100) {
        issues.push(`loss_ratio=${fmtPct(m.loss_ratio)} outside [40, 100]`);
        addFinding("WARNING", "Value Sanity", `Loss ratio ${fmtPct(m.loss_ratio)} outside expected 40-100% range`, co.ticker, co.sector, "loss_ratio");
      }
    }

    // combined_ratio (P&C/Re): 70-120%
    if ((co.sector === "P&C" || co.sector === "Reinsurance") && m.combined_ratio !== undefined) {
      if (m.combined_ratio < 70 || m.combined_ratio > 120) {
        issues.push(`combined_ratio=${fmtPct(m.combined_ratio)} outside [70, 120]`);
        addFinding("WARNING", "Value Sanity", `Combined ratio ${fmtPct(m.combined_ratio)} outside expected 70-120% range`, co.ticker, co.sector, "combined_ratio");
      }
    }

    // medical_loss_ratio (Health): 60-95%
    if (co.sector === "Health" && m.medical_loss_ratio !== undefined) {
      if (m.medical_loss_ratio < 60 || m.medical_loss_ratio > 95) {
        issues.push(`medical_loss_ratio=${fmtPct(m.medical_loss_ratio)} outside [60, 95]`);
        addFinding("WARNING", "Value Sanity", `Medical loss ratio ${fmtPct(m.medical_loss_ratio)} outside expected 60-95% range`, co.ticker, co.sector, "medical_loss_ratio");
      }
    }

    // revenue: Health > $10B (except MOH), Brokers > $1B
    if (m.revenue !== undefined) {
      if (co.sector === "Health" && co.ticker !== "MOH" && m.revenue < 10e9) {
        issues.push(`revenue=${fmtUSD(m.revenue)} < $10B (Health)`);
        addFinding("WARNING", "Value Sanity", `Health sector revenue ${fmtUSD(m.revenue)} below $10B threshold`, co.ticker, co.sector, "revenue");
      }
      if (co.sector === "Brokers" && m.revenue < 1e9) {
        issues.push(`revenue=${fmtUSD(m.revenue)} < $1B (Brokers)`);
        addFinding("WARNING", "Value Sanity", `Broker revenue ${fmtUSD(m.revenue)} below $1B threshold`, co.ticker, co.sector, "revenue");
      }
    }

    // net_premiums_earned: P&C > $500M
    if (co.sector === "P&C" && m.net_premiums_earned !== undefined && m.net_premiums_earned < 500e6) {
      issues.push(`net_premiums_earned=${fmtUSD(m.net_premiums_earned)} < $500M`);
      addFinding("WARNING", "Value Sanity", `P&C net premiums earned ${fmtUSD(m.net_premiums_earned)} below $500M`, co.ticker, co.sector, "net_premiums_earned");
    }

    // investment_income: P&C/Life > $100M for large companies (>$10B assets)
    if ((co.sector === "P&C" || co.sector === "Life") && m.investment_income !== undefined) {
      if (m.total_assets !== undefined && m.total_assets > 10e9 && m.investment_income < 100e6) {
        issues.push(`investment_income=${fmtUSD(m.investment_income)} < $100M (large co)`);
        addFinding("INFO", "Value Sanity", `Large company (assets ${fmtUSD(m.total_assets)}) but investment_income only ${fmtUSD(m.investment_income)}`, co.ticker, co.sector, "investment_income");
      }
    }

    // debt_to_equity: negative or >10
    if (m.debt_to_equity !== undefined) {
      if (m.debt_to_equity < 0) {
        issues.push(`debt_to_equity=${m.debt_to_equity.toFixed(2)} NEGATIVE`);
        addFinding("WARNING", "Value Sanity", `Negative debt-to-equity: ${m.debt_to_equity.toFixed(2)}`, co.ticker, co.sector, "debt_to_equity");
      } else if (m.debt_to_equity > 10) {
        issues.push(`debt_to_equity=${m.debt_to_equity.toFixed(2)} > 10`);
        addFinding("WARNING", "Value Sanity", `Debt-to-equity ${m.debt_to_equity.toFixed(2)} exceeds 10`, co.ticker, co.sector, "debt_to_equity");
      }
    }

    // book_value_per_share: <=0 or >$1000
    if (m.book_value_per_share !== undefined) {
      if (m.book_value_per_share <= 0) {
        issues.push(`book_value_per_share=$${m.book_value_per_share.toFixed(2)} <=0`);
        addFinding("WARNING", "Value Sanity", `Non-positive BVPS: $${m.book_value_per_share.toFixed(2)}`, co.ticker, co.sector, "book_value_per_share");
      } else if (m.book_value_per_share > 1000) {
        issues.push(`book_value_per_share=$${m.book_value_per_share.toFixed(2)} > $1000`);
        addFinding("WARNING", "Value Sanity", `BVPS $${m.book_value_per_share.toFixed(2)} exceeds $1000`, co.ticker, co.sector, "book_value_per_share");
      }
    }

    if (issues.length > 0) {
      console.log(`\n    ${co.ticker} (${co.name}, ${co.sector}):`);
      for (const i of issues) console.log(`      - ${i}`);
    }
  }

  // =====================================================================
  // CHECK 3: YEAR-OVER-YEAR CONSISTENCY
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 3: YEAR-OVER-YEAR CONSISTENCY (>50% change flagged)");
  console.log("=".repeat(100));

  const yoyMetrics = ["total_assets", "net_income", "net_premiums_earned"];

  for (const co of [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    const tickerTS = timeseries.get(co.ticker);
    if (!tickerTS) continue;

    const coIssues: string[] = [];

    for (const metricName of yoyMetrics) {
      const series = tickerTS.get(metricName);
      if (!series || series.length < 2) continue;

      // Sort by year, take last 3
      const sorted = [...series].sort((a, b) => a.year - b.year).slice(-3);

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.value === 0) continue;
        const pctChange = ((curr.value - prev.value) / Math.abs(prev.value)) * 100;
        if (Math.abs(pctChange) > 50) {
          const severity: Finding["severity"] = Math.abs(pctChange) > 100 ? "CRITICAL" : "WARNING";
          const msg = `${metricName}: FY${prev.year} ${fmtUSD(prev.value)} -> FY${curr.year} ${fmtUSD(curr.value)} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%)`;
          coIssues.push(msg);
          addFinding(severity, "YoY Consistency", msg, co.ticker, co.sector, metricName);
        }
      }
    }

    if (coIssues.length > 0) {
      console.log(`\n    ${co.ticker} (${co.name}, ${co.sector}):`);
      for (const i of coIssues) console.log(`      - ${i}`);
    }
  }

  // =====================================================================
  // CHECK 4: CROSS-METRIC CONSISTENCY
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 4: CROSS-METRIC CONSISTENCY");
  console.log("=".repeat(100));

  for (const co of [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    const metricsMap = latestByTicker.get(co.ticker);
    if (!metricsMap) continue;

    const m: Record<string, number> = {};
    for (const [name, row] of metricsMap) m[name] = row.metric_value;

    const issues: string[] = [];

    // A = L + E (within 5%)
    if (m.total_assets !== undefined && m.total_liabilities !== undefined && m.stockholders_equity !== undefined) {
      const sum = m.total_liabilities + m.stockholders_equity;
      const gap = Math.abs(m.total_assets - sum);
      const gapPct = m.total_assets !== 0 ? (gap / Math.abs(m.total_assets)) * 100 : 0;
      if (gapPct > 5) {
        const severity: Finding["severity"] = gapPct > 20 ? "CRITICAL" : "WARNING";
        const msg = `A=${fmtUSD(m.total_assets)} vs L+E=${fmtUSD(sum)} (gap ${gapPct.toFixed(1)}%)`;
        issues.push(msg);
        addFinding(severity, "Cross-Metric", `Accounting identity: total_assets (${fmtUSD(m.total_assets)}) != total_liabilities (${fmtUSD(m.total_liabilities)}) + equity (${fmtUSD(m.stockholders_equity)}) = ${fmtUSD(sum)}. Gap: ${gapPct.toFixed(1)}%`, co.ticker, co.sector);
      }
    }

    // P&C/Re: losses_incurred < net_premiums_earned * 1.2
    if ((co.sector === "P&C" || co.sector === "Reinsurance") && m.losses_incurred !== undefined && m.net_premiums_earned !== undefined) {
      if (m.losses_incurred > m.net_premiums_earned * 1.2) {
        const impliedLR = (m.losses_incurred / m.net_premiums_earned) * 100;
        const msg = `losses_incurred (${fmtUSD(m.losses_incurred)}) > 1.2x NPE (${fmtUSD(m.net_premiums_earned)}), implied LR=${fmtPct(impliedLR)}`;
        issues.push(msg);
        addFinding("WARNING", "Cross-Metric", msg, co.ticker, co.sector);
      }
    }

    // revenue >= net_premiums_earned
    if (m.revenue !== undefined && m.net_premiums_earned !== undefined) {
      if (m.net_premiums_earned > m.revenue * 1.1) {
        const msg = `net_premiums_earned (${fmtUSD(m.net_premiums_earned)}) > revenue (${fmtUSD(m.revenue)}) by >10%`;
        issues.push(msg);
        addFinding("WARNING", "Cross-Metric", msg, co.ticker, co.sector);
      }
    }

    if (issues.length > 0) {
      console.log(`\n    ${co.ticker} (${co.name}, ${co.sector}):`);
      for (const i of issues) console.log(`      - ${i}`);
    }
  }

  // =====================================================================
  // CHECK 5: FISCAL YEAR FRESHNESS
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 5: FISCAL YEAR FRESHNESS (latest total_assets year)");
  console.log("=".repeat(100));

  const tickersWithAssets = new Set<string>();

  for (const co of [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    const metricsMap = latestByTicker.get(co.ticker);
    const ta = metricsMap?.get("total_assets");

    if (!ta) {
      console.log(`    ${co.ticker.padEnd(8)} ${co.name.padEnd(35)} NO total_assets data`);
      addFinding("CRITICAL", "Freshness", `No total_assets data found`, co.ticker, co.sector, "total_assets");
      continue;
    }

    tickersWithAssets.add(co.ticker);
    const stale = ta.fiscal_year < 2023;
    const marker = stale ? " *** STALE (before 2023) ***" : ta.fiscal_year === 2023 ? " (2023 only)" : "";
    console.log(`    ${co.ticker.padEnd(8)} ${co.name.padEnd(35)} FY${ta.fiscal_year}  ${fmtUSD(ta.metric_value)}${marker}`);

    if (stale) {
      addFinding("CRITICAL", "Freshness", `Latest total_assets from FY${ta.fiscal_year} (before 2023)`, co.ticker, co.sector, "total_assets");
    } else if (ta.fiscal_year === 2023) {
      addFinding("INFO", "Freshness", `Latest total_assets from FY2023 (may need 2024 update)`, co.ticker, co.sector, "total_assets");
    }
  }

  // =====================================================================
  // CHECK 6: DERIVED METRIC VERIFICATION (CB, TRV, PGR, ALL, AIG)
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  CHECK 6: DERIVED METRIC VERIFICATION (CB, TRV, PGR, ALL, AIG)");
  console.log("=".repeat(100));

  const verifyTickers = ["CB", "TRV", "PGR", "ALL", "AIG"];

  for (const ticker of verifyTickers) {
    const co = companyByTicker.get(ticker);
    if (!co) {
      console.log(`\n    ${ticker}: COMPANY NOT FOUND`);
      addFinding("CRITICAL", "Derived Verification", `Company not found`, ticker);
      continue;
    }

    const metricsMap = latestByTicker.get(ticker);
    if (!metricsMap) {
      console.log(`\n    ${ticker}: NO METRICS DATA`);
      addFinding("CRITICAL", "Derived Verification", `No latest metrics found`, ticker, co.sector);
      continue;
    }

    const m: Record<string, number | undefined> = {};
    let latestYear = 0;
    for (const [name, row] of metricsMap) {
      m[name] = row.metric_value;
      if (row.fiscal_year > latestYear) latestYear = row.fiscal_year;
    }

    // Also get raw values for the latest year
    const yearMetrics = rawLookup.get(co.id)?.get(latestYear);
    const raw: Record<string, number | undefined> = {};
    if (yearMetrics) {
      for (const [name, row] of yearMetrics) raw[name] = row.metric_value;
    }

    console.log(`\n    ${ticker} (${co.name}) - FY${latestYear}:`);
    console.log(`      Raw inputs available: ${yearMetrics ? [...yearMetrics.keys()].sort().join(", ") : "NONE"}`);

    // ── Loss Ratio ──
    const rawLI = raw.losses_incurred ?? m.losses_incurred;
    const rawNPE = raw.net_premiums_earned ?? m.net_premiums_earned;
    if (rawLI !== undefined && rawNPE !== undefined && rawNPE !== 0) {
      const computed = (rawLI / rawNPE) * 100;
      const stored = m.loss_ratio;
      const diff = stored !== undefined ? Math.abs(computed - stored) : NaN;
      const status = stored === undefined ? "MISSING STORED" : diff <= 1 ? "PASS" : `MISMATCH (${diff.toFixed(2)}pp)`;
      console.log(`      Loss Ratio:     computed=${fmtPct(computed)}  stored=${stored !== undefined ? fmtPct(stored) : "N/A"}  => ${status}`);
      if (stored !== undefined && diff > 1) {
        addFinding("CRITICAL", "Derived Verification", `loss_ratio: computed ${fmtPct(computed)} vs stored ${fmtPct(stored)} (diff ${diff.toFixed(2)}pp)`, ticker, co.sector, "loss_ratio");
      } else if (stored === undefined) {
        addFinding("WARNING", "Derived Verification", `loss_ratio not stored but computable (${fmtPct(computed)})`, ticker, co.sector, "loss_ratio");
      }
    } else {
      console.log(`      Loss Ratio:     CANNOT COMPUTE (losses_incurred=${rawLI !== undefined ? fmtUSD(rawLI) : "MISSING"}, NPE=${rawNPE !== undefined ? fmtUSD(rawNPE) : "MISSING"})`);
      addFinding("WARNING", "Derived Verification", `Cannot verify loss_ratio - missing inputs (losses_incurred=${rawLI !== undefined ? "present" : "MISSING"}, NPE=${rawNPE !== undefined ? "present" : "MISSING"})`, ticker, co.sector, "loss_ratio");
    }

    // ── Expense Ratio ──
    const rawAcq = raw.acquisition_costs ?? m.acquisition_costs ?? 0;
    const rawUW = raw.underwriting_expenses ?? m.underwriting_expenses ?? 0;
    const totalExp = rawAcq + rawUW;
    if (totalExp > 0 && rawNPE !== undefined && rawNPE !== 0) {
      const computed = (totalExp / rawNPE) * 100;
      const stored = m.expense_ratio;
      const diff = stored !== undefined ? Math.abs(computed - stored) : NaN;
      const status = stored === undefined ? "MISSING STORED" : diff <= 1 ? "PASS" : `MISMATCH (${diff.toFixed(2)}pp)`;
      console.log(`      Expense Ratio:  computed=${fmtPct(computed)}  stored=${stored !== undefined ? fmtPct(stored) : "N/A"}  => ${status}`);
      if (stored !== undefined && diff > 1) {
        addFinding("CRITICAL", "Derived Verification", `expense_ratio: computed ${fmtPct(computed)} vs stored ${fmtPct(stored)} (diff ${diff.toFixed(2)}pp)`, ticker, co.sector, "expense_ratio");
      }
    } else {
      console.log(`      Expense Ratio:  CANNOT COMPUTE (acq_costs=${rawAcq !== 0 ? fmtUSD(rawAcq) : "0/MISSING"}, uw_exp=${rawUW !== 0 ? fmtUSD(rawUW) : "0/MISSING"}, NPE=${rawNPE !== undefined ? fmtUSD(rawNPE) : "MISSING"})`);
    }

    // ── Combined Ratio ──
    {
      const storedLR = m.loss_ratio;
      const storedER = m.expense_ratio;
      const storedCR = m.combined_ratio;

      if (storedLR !== undefined && storedER !== undefined) {
        const computed = storedLR + storedER;
        const diff = storedCR !== undefined ? Math.abs(computed - storedCR) : NaN;
        const status = storedCR === undefined ? "MISSING STORED" : diff <= 1 ? "PASS" : `MISMATCH (${diff.toFixed(2)}pp)`;
        console.log(`      Combined Ratio: LR+ER=${fmtPct(computed)}  stored=${storedCR !== undefined ? fmtPct(storedCR) : "N/A"}  => ${status}`);
        if (storedCR !== undefined && diff > 1) {
          addFinding("CRITICAL", "Derived Verification", `combined_ratio: LR(${fmtPct(storedLR)})+ER(${fmtPct(storedER)})=${fmtPct(computed)} vs stored ${fmtPct(storedCR)} (diff ${diff.toFixed(2)}pp)`, ticker, co.sector, "combined_ratio");
        }
      } else {
        console.log(`      Combined Ratio: stored=${storedCR !== undefined ? fmtPct(storedCR) : "N/A"} (cannot decompose: LR=${storedLR !== undefined ? fmtPct(storedLR) : "MISSING"}, ER=${storedER !== undefined ? fmtPct(storedER) : "MISSING"})`);
      }
    }

    // ── ROE ──
    const rawNI = raw.net_income ?? m.net_income;
    const rawEQ = raw.stockholders_equity ?? m.stockholders_equity;
    if (rawNI !== undefined && rawEQ !== undefined && rawEQ !== 0) {
      const computed = (rawNI / rawEQ) * 100;
      const stored = m.roe;
      const diff = stored !== undefined ? Math.abs(computed - stored) : NaN;
      const status = stored === undefined ? "MISSING STORED" : diff <= 1 ? "PASS" : `MISMATCH (${diff.toFixed(2)}pp)`;
      console.log(`      ROE:            computed=${fmtPct(computed)}  stored=${stored !== undefined ? fmtPct(stored) : "N/A"}  => ${status}`);
      if (stored !== undefined && diff > 1) {
        addFinding("CRITICAL", "Derived Verification", `roe: computed ${fmtPct(computed)} vs stored ${fmtPct(stored)} (diff ${diff.toFixed(2)}pp)`, ticker, co.sector, "roe");
      }
    } else {
      console.log(`      ROE:            CANNOT COMPUTE (NI=${rawNI !== undefined ? fmtUSD(rawNI) : "MISSING"}, EQ=${rawEQ !== undefined ? fmtUSD(rawEQ) : "MISSING"})`);
      addFinding("WARNING", "Derived Verification", `Cannot verify ROE - missing inputs`, ticker, co.sector, "roe");
    }
  }

  // =====================================================================
  // FINAL SUMMARY
  // =====================================================================
  console.log("\n\n" + "=".repeat(100));
  console.log("  FINAL AUDIT SUMMARY");
  console.log("=".repeat(100));

  const critical = findings.filter(f => f.severity === "CRITICAL");
  const warnings = findings.filter(f => f.severity === "WARNING");
  const info = findings.filter(f => f.severity === "INFO");

  console.log(`\n  Total findings: ${findings.length}`);
  console.log(`    CRITICAL: ${critical.length}`);
  console.log(`    WARNING:  ${warnings.length}`);
  console.log(`    INFO:     ${info.length}`);

  if (critical.length > 0) {
    console.log("\n  ========== CRITICAL FINDINGS ==========");
    for (const f of critical) {
      console.log(`    [${f.category}] ${f.company || ""}${f.sector ? ` (${f.sector})` : ""}: ${f.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\n  ========== WARNING FINDINGS ==========");
    for (const f of warnings) {
      console.log(`    [${f.category}] ${f.company || ""}${f.sector ? ` (${f.sector})` : ""}: ${f.message}`);
    }
  }

  if (info.length > 0) {
    console.log("\n  ========== INFO FINDINGS ==========");
    for (const f of info) {
      console.log(`    [${f.category}] ${f.company || ""}${f.sector ? ` (${f.sector})` : ""}: ${f.message}`);
    }
  }

  // Companies by issue count
  const byCo: Record<string, { critical: number; warning: number; info: number; total: number }> = {};
  for (const f of findings) {
    if (!f.company) continue;
    if (!byCo[f.company]) byCo[f.company] = { critical: 0, warning: 0, info: 0, total: 0 };
    byCo[f.company][f.severity === "CRITICAL" ? "critical" : f.severity === "WARNING" ? "warning" : "info"]++;
    byCo[f.company].total++;
  }
  const sortedCos = Object.entries(byCo).sort((a, b) => b[1].total - a[1].total);

  console.log("\n  ========== COMPANIES BY ISSUE COUNT ==========");
  for (const [ticker, counts] of sortedCos) {
    console.log(`    ${ticker.padEnd(8)} Total: ${counts.total}  (C:${counts.critical} W:${counts.warning} I:${counts.info})`);
  }

  // By category
  const byCat: Record<string, number> = {};
  for (const f of findings) {
    byCat[f.category] = (byCat[f.category] || 0) + 1;
  }
  console.log("\n  ========== FINDINGS BY CATEGORY ==========");
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  console.log("\n" + "=".repeat(100));
  console.log("  AUDIT COMPLETE");
  console.log("=".repeat(100));
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
