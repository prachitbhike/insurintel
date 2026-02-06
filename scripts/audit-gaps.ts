import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORE_METRICS = [
  "revenue", "net_premiums_earned", "losses_incurred", "net_income",
  "stockholders_equity", "total_assets", "total_liabilities", "total_debt",
  "eps", "shares_outstanding", "investment_income",
  "acquisition_costs", "underwriting_expenses", "medical_claims_expense"
];

const DERIVED_METRICS = [
  "loss_ratio", "expense_ratio", "combined_ratio", "roe", "roa",
  "book_value_per_share", "debt_to_equity", "medical_loss_ratio", "premium_growth_yoy"
];

async function main() {
  const { data: companies } = await sb.from("companies").select("id,ticker,sector").order("sector,ticker");
  if (!companies) return;

  console.log("=== MISSING METRICS BY COMPANY (FY2024 Annual) ===\n");

  for (const co of companies) {
    const { data: metrics } = await sb.from("financial_metrics")
      .select("metric_name")
      .eq("company_id", co.id)
      .eq("fiscal_year", 2024)
      .eq("period_type", "annual");

    const present = new Set((metrics || []).map((m: any) => m.metric_name));
    const missingCore = CORE_METRICS.filter(m => !present.has(m));
    const missingDerived = DERIVED_METRICS.filter(m => !present.has(m));

    if (missingCore.length > 0 || missingDerived.length > 0) {
      console.log(`${co.ticker} (${co.sector}):`);
      if (missingCore.length > 0) console.log(`  Core: ${missingCore.join(", ")}`);
      if (missingDerived.length > 0) console.log(`  Derived: ${missingDerived.join(", ")}`);
    }
  }

  // Companies with zero FY2024 data
  console.log("\n=== COMPANIES WITHOUT FY2024 DATA ===");
  for (const co of companies) {
    const { count } = await sb.from("financial_metrics")
      .select("*", { count: "exact", head: true })
      .eq("company_id", co.id)
      .eq("fiscal_year", 2024)
      .eq("period_type", "annual");
    if (count === 0) {
      console.log(`${co.ticker} (${co.sector}): no FY2024 annual data`);
    }
  }

  // Now check FY2023 gaps too
  console.log("\n=== MISSING METRICS BY COMPANY (FY2023 Annual) ===\n");
  for (const co of companies) {
    const { data: metrics } = await sb.from("financial_metrics")
      .select("metric_name")
      .eq("company_id", co.id)
      .eq("fiscal_year", 2023)
      .eq("period_type", "annual");

    const present = new Set((metrics || []).map((m: any) => m.metric_name));
    const missingCore = CORE_METRICS.filter(m => !present.has(m));

    if (missingCore.length > 0) {
      console.log(`${co.ticker} (${co.sector}):`);
      console.log(`  Core: ${missingCore.join(", ")}`);
    }
  }

  // Check total_debt and stockholders_equity specifically across all years
  console.log("\n=== TOTAL_DEBT COVERAGE ===");
  for (const co of companies) {
    const { data: debtRows } = await sb.from("financial_metrics")
      .select("fiscal_year,metric_value")
      .eq("company_id", co.id)
      .eq("metric_name", "total_debt")
      .eq("period_type", "annual")
      .order("fiscal_year");
    const years = (debtRows || []).map((r: any) => r.fiscal_year).join(",");
    if (!years) {
      console.log(`${co.ticker}: NO total_debt data`);
    } else {
      console.log(`${co.ticker}: ${years}`);
    }
  }

  console.log("\n=== STOCKHOLDERS_EQUITY COVERAGE ===");
  for (const co of companies) {
    const { data: eqRows } = await sb.from("financial_metrics")
      .select("fiscal_year,metric_value")
      .eq("company_id", co.id)
      .eq("metric_name", "stockholders_equity")
      .eq("period_type", "annual")
      .order("fiscal_year");
    const years = (eqRows || []).map((r: any) => r.fiscal_year).join(",");
    if (!years) {
      console.log(`${co.ticker}: NO stockholders_equity data`);
    } else {
      console.log(`${co.ticker}: ${years}`);
    }
  }
}

main().catch(console.error);
