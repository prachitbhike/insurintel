import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check(ticker: string, metricName: string) {
  const { data: co } = await sb.from("companies").select("id,sector").eq("ticker", ticker).single();
  if (!co) return `${ticker}: NOT FOUND`;
  const { data: rows } = await sb.from("financial_metrics")
    .select("fiscal_year,metric_value")
    .eq("company_id", co.id).eq("metric_name", metricName).eq("period_type", "annual")
    .order("fiscal_year");
  if (!rows || rows.length === 0) return `${ticker} ${metricName}: MISSING`;
  const vals = rows.map((r: any) => `FY${r.fiscal_year}:${fmt(r.metric_value, metricName)}`).join(", ");
  return `${ticker} ${metricName}: ${vals}`;
}

function fmt(v: number, metric: string): string {
  if (metric.includes("ratio") || metric === "roe" || metric === "roa" || metric === "premium_growth_yoy" || metric === "medical_loss_ratio") return v.toFixed(1) + "%";
  if (metric === "eps" || metric === "book_value_per_share") return "$" + v.toFixed(2);
  if (metric === "debt_to_equity") return v.toFixed(2) + "x";
  if (metric === "shares_outstanding") return (v / 1e6).toFixed(0) + "M";
  return "$" + (v / 1e9).toFixed(2) + "B";
}

async function main() {
  console.log("=== PREVIOUSLY MISSING: total_debt ===");
  for (const t of ["TRV","PGR","CVS","MET","ORI","ACGL","WRB","AIZ","HUM","MOH","GL","EG","BRK.B"]) {
    console.log(await check(t, "total_debt"));
  }
  console.log(await check("TRV", "debt_to_equity"));
  console.log(await check("PGR", "debt_to_equity"));
  console.log(await check("ORI", "debt_to_equity"));
  console.log(await check("ACGL", "debt_to_equity"));

  console.log("\n=== PREVIOUSLY MISSING: stockholders_equity ===");
  console.log(await check("UNH", "stockholders_equity"));
  console.log(await check("MMC", "stockholders_equity"));
  console.log(await check("UNH", "roe"));
  console.log(await check("MMC", "roe"));

  console.log("\n=== PREVIOUSLY MISSING: shares_outstanding ===");
  for (const t of ["PRU","PGR","HIG","CINF","ORI","AON","WTW","HUM","MKL","UNM","RGA"]) {
    console.log(await check(t, "shares_outstanding"));
  }
  console.log(await check("PGR", "book_value_per_share"));
  console.log(await check("HIG", "book_value_per_share"));
  console.log(await check("PRU", "book_value_per_share"));

  console.log("\n=== PREVIOUSLY MISSING: losses_incurred (tag transitions) ===");
  console.log(await check("MKL", "losses_incurred"));
  console.log(await check("ALL", "losses_incurred"));
  console.log(await check("MKL", "loss_ratio"));
  console.log(await check("MKL", "combined_ratio"));

  console.log("\n=== PREVIOUSLY MISSING: medical_claims_expense ===");
  for (const t of ["UNH","HUM","CNC","CVS","MOH"]) {
    console.log(await check(t, "medical_claims_expense"));
  }
  console.log(await check("UNH", "medical_loss_ratio"));
  console.log(await check("HUM", "medical_loss_ratio"));
  console.log(await check("MOH", "medical_loss_ratio"));
  console.log(await check("CVS", "medical_loss_ratio"));

  console.log("\n=== GL (Globe Life — was D.R. Horton) ===");
  for (const m of ["revenue","net_premiums_earned","net_income","stockholders_equity","total_assets","roe","investment_income"]) {
    console.log(await check("GL", m));
  }
}

main().catch(console.error);
