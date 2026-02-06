import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getValueChainData, type ValueChainData } from "@/lib/queries/value-chain";
import { ValueChainFlow } from "@/components/value-chain/value-chain-flow";
import { formatCurrency } from "@/lib/metrics/formatters";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Value Chain",
  description:
    "Interactive visualization of how premiums flow through the insurance value chain with real dollar amounts.",
};

export default async function ValueChainPage() {
  let data: ValueChainData = {
    totalPremiums: 0,
    totalClaims: 0,
    totalExpenses: 0,
    totalInvestmentIncome: 0,
    totalNetIncome: 0,
    brokerRevenue: 0,
    reinsurancePremiums: 0,
    bySector: {},
  };

  try {
    const supabase = await createClient();
    data = await getValueChainData(supabase);
  } catch {
    // Gracefully handle
  }

  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Value Chain
        </p>
        <h1 className="text-3xl font-display tracking-tight">
          Insurance Value Chain
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          How premiums flow through the insurance ecosystem — from policyholders
          through brokers, carriers, and reinsurers, to claims payouts and
          investment income.
        </p>
      </div>

      <ValueChainFlow data={data} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(data.bySector).map(([sector, stats]) => (
          <div key={sector} className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {sector}
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Premiums</span>
                <span className="font-mono font-medium">{formatCurrency(stats.premiums)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Losses</span>
                <span className="font-mono font-medium">{formatCurrency(stats.losses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Income</span>
                <span className="font-mono font-medium">{formatCurrency(stats.netIncome)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
