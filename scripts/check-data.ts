import { createClient } from "@supabase/supabase-js";
import { getBulkScoringData } from "../src/lib/queries/metrics";
import { computeProspectScoresBatch } from "../src/lib/scoring";
import { buildSectorDashboardFromBulk } from "../src/lib/queries/sector-dashboard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  console.log("Fetching bulk scoring data...");
  const bulkData = await getBulkScoringData(supabase);
  
  // Check timeseries for one P&C company (ACGL)
  const acgl = bulkData.companies.find(c => c.ticker === "ACGL");
  if (acgl) {
    const ts = bulkData.timeseries[acgl.id];
    console.log(`\nACGL timeseries metrics: ${Object.keys(ts || {}).length}`);
    for (const [metric, entries] of Object.entries(ts || {})) {
      const years = entries.map(e => e.fiscal_year).sort();
      console.log(`  ${metric}: years=${years.join(",")}`);
    }
    console.log(`\nACGL latestMetrics:`, Object.keys(bulkData.latestMetrics[acgl.id] || {}));
    console.log(`  loss_ratio = ${bulkData.latestMetrics[acgl.id]?.loss_ratio}`);
    console.log(`  expense_ratio = ${bulkData.latestMetrics[acgl.id]?.expense_ratio}`);
    console.log(`  net_premiums_earned = ${bulkData.latestMetrics[acgl.id]?.net_premiums_earned}`);
  }

  console.log("\nBuilding P&C sector dashboard...");
  const scores = computeProspectScoresBatch(bulkData);
  const dashboard = buildSectorDashboardFromBulk(bulkData, scores, "P&C");
  
  console.log(`\nDashboard years: ${dashboard.years}`);
  console.log(`Dashboard carriers: ${dashboard.carriers.length}`);
  
  // Check first 3 carriers
  for (const c of dashboard.carriers.slice(0, 3)) {
    const yearKeys = Object.keys(c.metricsByYear).sort();
    const latestKeys = Object.keys(c.latest);
    console.log(`\n${c.ticker}:`);
    console.log(`  metricsByYear keys: ${yearKeys.join(", ")}`);
    console.log(`  latest keys: ${latestKeys.length > 0 ? latestKeys.join(", ") : "EMPTY!"}`);
    if (latestKeys.length > 0) {
      console.log(`  latest.loss_ratio = ${c.latest.loss_ratio}`);
      console.log(`  latest.net_premiums_earned = ${c.latest.net_premiums_earned}`);
    }
  }
}

check().catch(console.error);
