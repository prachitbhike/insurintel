import { type SupabaseClient } from "@supabase/supabase-js";

export interface ValueChainNode {
  id: string;
  label: string;
  description: string;
  amount: number | null;
  sector?: string;
}

export interface ValueChainData {
  totalPremiums: number;
  totalClaims: number;
  totalExpenses: number;
  totalInvestmentIncome: number;
  totalNetIncome: number;
  brokerRevenue: number;
  reinsurancePremiums: number;
  bySector: Record<string, {
    premiums: number;
    losses: number;
    expenses: number;
    netIncome: number;
  }>;
}

export async function getValueChainData(
  supabase: SupabaseClient
): Promise<ValueChainData> {
  const { data: latestMetrics } = await supabase
    .from("mv_latest_metrics")
    .select("ticker, sector, metric_name, metric_value")
    .in("metric_name", [
      "net_premiums_earned",
      "losses_incurred",
      "underwriting_expenses",
      "investment_income",
      "net_income",
      "revenue",
    ]);

  const result: ValueChainData = {
    totalPremiums: 0,
    totalClaims: 0,
    totalExpenses: 0,
    totalInvestmentIncome: 0,
    totalNetIncome: 0,
    brokerRevenue: 0,
    reinsurancePremiums: 0,
    bySector: {},
  };

  if (!latestMetrics) return result;

  // Build per-company metrics
  const byTicker = new Map<string, { sector: string; metrics: Record<string, number> }>();
  for (const m of latestMetrics) {
    if (!byTicker.has(m.ticker)) {
      byTicker.set(m.ticker, { sector: m.sector, metrics: {} });
    }
    byTicker.get(m.ticker)!.metrics[m.metric_name] = m.metric_value;
  }

  for (const [, company] of byTicker) {
    const { sector, metrics } = company;
    if (!result.bySector[sector]) {
      result.bySector[sector] = { premiums: 0, losses: 0, expenses: 0, netIncome: 0 };
    }

    const premiums = metrics.net_premiums_earned ?? 0;
    const losses = metrics.losses_incurred ?? 0;
    const expenses = metrics.underwriting_expenses ?? 0;
    const investmentIncome = metrics.investment_income ?? 0;
    const netIncome = metrics.net_income ?? 0;
    const revenue = metrics.revenue ?? 0;

    if (sector === "Brokers") {
      result.brokerRevenue += revenue;
    } else if (sector === "Reinsurance") {
      result.reinsurancePremiums += premiums;
    }

    result.totalPremiums += premiums;
    result.totalClaims += losses;
    result.totalExpenses += expenses;
    result.totalInvestmentIncome += investmentIncome;
    result.totalNetIncome += netIncome;

    result.bySector[sector].premiums += premiums;
    result.bySector[sector].losses += losses;
    result.bySector[sector].expenses += expenses;
    result.bySector[sector].netIncome += netIncome;
  }

  return result;
}
