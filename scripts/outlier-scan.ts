/**
 * InsurIntel — Data Outlier Scanner
 *
 * Scans all annual financial_metrics for statistical outliers,
 * known problem areas, and year-over-year jumps.
 *
 * Run: npx tsx scripts/outlier-scan.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cocgrzdkgjzznsfquany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY2dyemRrZ2p6em5zZnF1YW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzcwOCwiZXhwIjoyMDg1OTAzNzA4fQ.j5WnvQvCJ0CCwyFrDbe0LCeqvQ4DyAr0sQhqCeAbVCU"
);

interface CompanyRow { id: string; ticker: string; name: string; sector: string; }
interface MetricRow { company_id: string; metric_name: string; metric_value: number; fiscal_year: number; period_type: string; }

async function fetchAll<T>(table: string, selectCols: string, filters?: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    let query = supabase.from(table).select(selectCols).range(offset, offset + pageSize - 1);
    if (filters) { for (const [k, v] of Object.entries(filters)) query = query.eq(k, v); }
    const { data, error } = await query;
    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

function computeStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { min: 0, max: 0, mean: 0, stddev: 0, count: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  return { min: sorted[0], max: sorted[n - 1], mean, stddev: Math.sqrt(variance), count: n, median };
}

// Percent metrics are stored as 0-100 range (e.g. 95.2 = 95.2%)
const PCT_METRICS = new Set(["loss_ratio", "expense_ratio", "combined_ratio", "roe", "roa", "medical_loss_ratio", "premium_growth_yoy"]);
const DOLLAR_METRICS = new Set(["net_premiums_earned", "losses_incurred", "acquisition_costs", "underwriting_expenses", "net_income", "stockholders_equity", "total_assets", "total_liabilities", "investment_income", "total_debt", "revenue", "medical_claims_expense"]);

function fmtVal(metric: string, v: number): string {
  if (PCT_METRICS.has(metric)) return `${v.toFixed(1)}%`;
  if (metric === "debt_to_equity") return `${v.toFixed(2)}x`;
  if (metric === "eps" || metric === "book_value_per_share") return `$${v.toFixed(2)}`;
  if (DOLLAR_METRICS.has(metric) || metric === "shares_outstanding") {
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  return v.toFixed(2);
}

async function main() {
  console.log("=".repeat(110));
  console.log("  INSURINTEL DATA OUTLIER SCAN");
  console.log("=".repeat(110));

  const companies = await fetchAll<CompanyRow>("companies", "id, ticker, name, sector");
  const allMetrics = await fetchAll<MetricRow>("financial_metrics", "company_id, metric_name, metric_value, fiscal_year, period_type", { period_type: "annual" });
  console.log(`\n  ${companies.length} companies, ${allMetrics.length} annual metric rows\n`);

  const companyById = new Map<string, CompanyRow>();
  for (const c of companies) companyById.set(c.id, c);

  // Group metrics
  const metricsByName = new Map<string, { row: MetricRow; company: CompanyRow }[]>();
  for (const m of allMetrics) {
    const co = companyById.get(m.company_id);
    if (!co) continue;
    if (!metricsByName.has(m.metric_name)) metricsByName.set(m.metric_name, []);
    metricsByName.get(m.metric_name)!.push({ row: m, company: co });
  }

  // =====================================================================
  // SECTION 1: KNOWN PROBLEM AREA CHECKS
  // =====================================================================
  console.log("=".repeat(110));
  console.log("  SECTION 1: KNOWN PROBLEM AREA CHECKS");
  console.log("=".repeat(110));

  const actionItems: { ticker: string; sector: string; metric: string; year: number; value: number; issue: string; action: string }[] = [];

  // 1a: ALL losses_incurred FY2022-2024 (should be deleted)
  console.log("\n  --- Allstate losses_incurred FY2022-2024 ---");
  const allLosses = allMetrics.filter(m => { const co = companyById.get(m.company_id); return co?.ticker === "ALL" && m.metric_name === "losses_incurred" && m.fiscal_year >= 2022; });
  const allRatios = allMetrics.filter(m => { const co = companyById.get(m.company_id); return co?.ticker === "ALL" && (m.metric_name === "loss_ratio" || m.metric_name === "combined_ratio") && m.fiscal_year >= 2022; });
  if (allLosses.length === 0 && allRatios.length === 0) {
    console.log("    CLEAN: Allstate bad data already deleted.");
  } else {
    for (const r of [...allLosses, ...allRatios].sort((a, b) => a.fiscal_year - b.fiscal_year)) {
      const co = companyById.get(r.company_id)!;
      console.log(`    DIRTY: ${r.metric_name} FY${r.fiscal_year}: ${fmtVal(r.metric_name, r.metric_value)}`);
      actionItems.push({ ticker: "ALL", sector: co.sector, metric: r.metric_name, year: r.fiscal_year, value: r.metric_value, issue: "Reserve development tag only ($2.9B vs actual ~$40B+)", action: "DELETE" });
    }
  }

  // 1b: AON extreme ROE/D-E/BVPS (negative equity from buybacks)
  console.log("\n  --- AON extreme metrics (negative equity from buybacks) ---");
  for (const metricName of ["roe", "debt_to_equity", "book_value_per_share", "roa"]) {
    const aonMetrics = allMetrics.filter(m => { const co = companyById.get(m.company_id); return co?.ticker === "AON" && m.metric_name === metricName; });
    for (const r of aonMetrics.sort((a, b) => a.fiscal_year - b.fiscal_year)) {
      const extreme = (metricName === "roe" && Math.abs(r.metric_value) > 200) ||
        (metricName === "debt_to_equity" && (r.metric_value < 0 || r.metric_value > 50)) ||
        (metricName === "book_value_per_share" && r.metric_value < -30) ||
        (metricName === "roa" && Math.abs(r.metric_value) > 50);
      if (extreme) {
        console.log(`    AON ${metricName} FY${r.fiscal_year}: ${fmtVal(metricName, r.metric_value)} ** EXTREME **`);
        actionItems.push({ ticker: "AON", sector: "Brokers", metric: metricName, year: r.fiscal_year, value: r.metric_value, issue: "Negative equity from share buybacks distorts ratio", action: "DELETE" });
      }
    }
  }

  // =====================================================================
  // SECTION 2: STATISTICAL OUTLIERS (3-sigma, global + intra-sector)
  // =====================================================================
  console.log("\n" + "=".repeat(110));
  console.log("  SECTION 2: 3-SIGMA OUTLIERS (GLOBAL)");
  console.log("=".repeat(110));

  for (const metricName of [...metricsByName.keys()].sort()) {
    const entries = metricsByName.get(metricName)!;
    const values = entries.map(e => e.row.metric_value);
    const stats = computeStats(values);
    if (stats.stddev === 0) continue;

    const outliers = entries.filter(e => Math.abs((e.row.metric_value - stats.mean) / stats.stddev) > 3);
    if (outliers.length > 0) {
      console.log(`\n  ${metricName} (n=${stats.count}, mean=${fmtVal(metricName, stats.mean)}, σ=${fmtVal(metricName, stats.stddev)}):`);
      for (const e of outliers.sort((a, b) => Math.abs(b.row.metric_value - stats.mean) - Math.abs(a.row.metric_value - stats.mean))) {
        const z = (e.row.metric_value - stats.mean) / stats.stddev;
        console.log(`    ${e.company.ticker.padEnd(8)} ${e.company.sector.padEnd(14)} FY${e.row.fiscal_year}  ${fmtVal(metricName, e.row.metric_value).padEnd(16)}  z=${z.toFixed(1)}`);
      }
    }
  }

  // =====================================================================
  // SECTION 3: INTRA-SECTOR OUTLIERS
  // =====================================================================
  console.log("\n\n" + "=".repeat(110));
  console.log("  SECTION 3: 3-SIGMA OUTLIERS (WITHIN SECTOR)");
  console.log("=".repeat(110));

  const sectorMetrics = new Map<string, Map<string, { row: MetricRow; company: CompanyRow }[]>>();
  for (const m of allMetrics) {
    const co = companyById.get(m.company_id);
    if (!co) continue;
    if (!sectorMetrics.has(co.sector)) sectorMetrics.set(co.sector, new Map());
    const sm = sectorMetrics.get(co.sector)!;
    if (!sm.has(m.metric_name)) sm.set(m.metric_name, []);
    sm.get(m.metric_name)!.push({ row: m, company: co });
  }

  for (const [sector, metricMap] of [...sectorMetrics.entries()].sort()) {
    const sectorOutliers: string[] = [];
    for (const [metricName, entries] of [...metricMap.entries()].sort()) {
      const values = entries.map(e => e.row.metric_value);
      const stats = computeStats(values);
      if (stats.stddev === 0) continue;
      for (const e of entries) {
        const z = (e.row.metric_value - stats.mean) / stats.stddev;
        if (Math.abs(z) > 3) {
          sectorOutliers.push(`    ${e.company.ticker.padEnd(8)} ${metricName.padEnd(24)} FY${e.row.fiscal_year}  ${fmtVal(metricName, e.row.metric_value).padEnd(16)}  z=${z.toFixed(1)} (sector mean=${fmtVal(metricName, stats.mean)})`);
        }
      }
    }
    if (sectorOutliers.length > 0) {
      console.log(`\n  === ${sector} ===`);
      sectorOutliers.forEach(s => console.log(s));
    }
  }

  // =====================================================================
  // SECTION 4: YOY JUMPS
  // =====================================================================
  console.log("\n\n" + "=".repeat(110));
  console.log("  SECTION 4: EXTREME YEAR-OVER-YEAR JUMPS");
  console.log("=".repeat(110));

  const companyTimeseries = new Map<string, Map<string, Map<number, number>>>();
  for (const m of allMetrics) {
    const co = companyById.get(m.company_id);
    if (!co) continue;
    if (!companyTimeseries.has(co.ticker)) companyTimeseries.set(co.ticker, new Map());
    const mm = companyTimeseries.get(co.ticker)!;
    if (!mm.has(m.metric_name)) mm.set(m.metric_name, new Map());
    mm.get(m.metric_name)!.set(m.fiscal_year, m.metric_value);
  }

  let yoyCount = 0;
  for (const [ticker, metricMap] of [...companyTimeseries.entries()].sort()) {
    const co = companies.find(c => c.ticker === ticker)!;
    for (const [metricName, yearValues] of [...metricMap.entries()].sort()) {
      const years = [...yearValues.keys()].sort();
      for (let i = 1; i < years.length; i++) {
        if (years[i] - years[i - 1] !== 1) continue;
        const prev = yearValues.get(years[i - 1])!;
        const cur = yearValues.get(years[i])!;
        let isJump = false;
        if (PCT_METRICS.has(metricName) || metricName === "debt_to_equity") {
          isJump = Math.abs(cur - prev) > 50; // >50 pp change for ratios stored as 0-100
        } else if (metricName === "eps") {
          isJump = Math.abs(cur - prev) > 50;
        } else if (prev !== 0) {
          isJump = Math.abs((cur - prev) / prev) > 2; // >200% change for dollar metrics
        }
        if (isJump) {
          yoyCount++;
          const change = PCT_METRICS.has(metricName) || metricName === "debt_to_equity"
            ? `${(cur - prev).toFixed(1)}pp`
            : prev !== 0 ? `${(((cur - prev) / prev) * 100).toFixed(0)}%` : "from zero";
          console.log(`    ${ticker.padEnd(8)} ${co.sector.padEnd(14)} ${metricName.padEnd(24)} FY${years[i - 1]}→${years[i]}: ${fmtVal(metricName, prev)} → ${fmtVal(metricName, cur)}  (${change})`);
        }
      }
    }
  }
  if (yoyCount === 0) console.log("    No extreme YoY jumps found.");

  // =====================================================================
  // SECTION 5: SUSPICIOUS VALUES
  // =====================================================================
  console.log("\n\n" + "=".repeat(110));
  console.log("  SECTION 5: SUSPICIOUS VALUES");
  console.log("=".repeat(110));

  // Negative values for always-positive metrics
  console.log("\n  --- Negative values for always-positive metrics ---");
  let negCount = 0;
  for (const metricName of ["total_assets", "shares_outstanding", "revenue", "net_premiums_earned"]) {
    const entries = metricsByName.get(metricName);
    if (!entries) continue;
    for (const e of entries) {
      if (e.row.metric_value < 0) {
        negCount++;
        console.log(`    ${e.company.ticker.padEnd(8)} ${metricName.padEnd(24)} FY${e.row.fiscal_year}: ${fmtVal(metricName, e.row.metric_value)} ** NEGATIVE **`);
        actionItems.push({ ticker: e.company.ticker, sector: e.company.sector, metric: metricName, year: e.row.fiscal_year, value: e.row.metric_value, issue: "Negative value for always-positive metric", action: "INVESTIGATE" });
      }
    }
  }
  if (negCount === 0) console.log("    None found.");

  // Negative BVPS (negative equity)
  console.log("\n  --- Negative book value per share ---");
  let negBvps = 0;
  const bvpsEntries = metricsByName.get("book_value_per_share");
  if (bvpsEntries) {
    for (const e of bvpsEntries) {
      if (e.row.metric_value < 0) {
        negBvps++;
        console.log(`    ${e.company.ticker.padEnd(8)} ${e.company.sector.padEnd(14)} FY${e.row.fiscal_year}: ${fmtVal("book_value_per_share", e.row.metric_value)}`);
        actionItems.push({ ticker: e.company.ticker, sector: e.company.sector, metric: "book_value_per_share", year: e.row.fiscal_year, value: e.row.metric_value, issue: "Negative BVPS from negative equity", action: "DELETE (distorts charts)" });
      }
    }
  }
  if (negBvps === 0) console.log("    None found.");

  // Extreme D/E (negative or >50x)
  console.log("\n  --- Extreme debt-to-equity (negative or >50x) ---");
  let extremeDE = 0;
  const deEntries = metricsByName.get("debt_to_equity");
  if (deEntries) {
    for (const e of deEntries) {
      if (e.row.metric_value < 0 || e.row.metric_value > 50) {
        extremeDE++;
        console.log(`    ${e.company.ticker.padEnd(8)} ${e.company.sector.padEnd(14)} FY${e.row.fiscal_year}: ${fmtVal("debt_to_equity", e.row.metric_value)}`);
        actionItems.push({ ticker: e.company.ticker, sector: e.company.sector, metric: "debt_to_equity", year: e.row.fiscal_year, value: e.row.metric_value, issue: "Extreme D/E from negative equity or excessive leverage", action: "DELETE (distorts charts)" });
      }
    }
  }
  if (extremeDE === 0) console.log("    None found.");

  // Extreme ROE (>200% or <-200%)
  console.log("\n  --- Extreme ROE (>200% or <-200%) ---");
  let extremeROE = 0;
  const roeEntries = metricsByName.get("roe");
  if (roeEntries) {
    for (const e of roeEntries) {
      if (Math.abs(e.row.metric_value) > 200) {
        extremeROE++;
        console.log(`    ${e.company.ticker.padEnd(8)} ${e.company.sector.padEnd(14)} FY${e.row.fiscal_year}: ${fmtVal("roe", e.row.metric_value)}`);
      }
    }
  }
  if (extremeROE === 0) console.log("    None found.");

  // =====================================================================
  // SECTION 6: ACTION ITEMS SUMMARY
  // =====================================================================
  console.log("\n\n" + "=".repeat(110));
  console.log("  SECTION 6: ACTION ITEMS");
  console.log("=".repeat(110));

  if (actionItems.length === 0) {
    console.log("\n  No action items — data is clean.");
  } else {
    // Group by action type
    const deletes = actionItems.filter(a => a.action === "DELETE");
    const investigates = actionItems.filter(a => a.action !== "DELETE");
    if (deletes.length > 0) {
      console.log(`\n  DELETE (${deletes.length} records):`);
      for (const a of deletes) {
        console.log(`    ${a.ticker.padEnd(8)} ${a.metric.padEnd(24)} FY${a.year}  ${fmtVal(a.metric, a.value).padEnd(16)}  ${a.issue}`);
      }
    }
    if (investigates.length > 0) {
      console.log(`\n  INVESTIGATE (${investigates.length} records):`);
      for (const a of investigates) {
        console.log(`    ${a.ticker.padEnd(8)} ${a.metric.padEnd(24)} FY${a.year}  ${fmtVal(a.metric, a.value).padEnd(16)}  ${a.issue}`);
      }
    }
  }

  console.log("\n" + "=".repeat(110));
  console.log("  SCAN COMPLETE");
  console.log("=".repeat(110));
}

main().catch((err) => { console.error("SCAN FAILED:", err); process.exit(1); });
