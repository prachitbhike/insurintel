import { KpiCard } from "./kpi-card";

interface HeroBenchmarksProps {
  totalPremium: number | null;
  avgCombinedRatio: number | null;
  avgExpenseRatio: number | null;
  trackedCompanies: number;
}

export function HeroBenchmarks({
  totalPremium,
  avgCombinedRatio,
  avgExpenseRatio,
  trackedCompanies,
}: HeroBenchmarksProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        title="Total Addressable Premium"
        metricName="net_premiums_earned"
        value={totalPremium}
        tooltip={`Sum of net premiums earned across ${trackedCompanies} tracked insurers — not the entire market`}
      />
      <KpiCard
        title="Avg Combined Ratio"
        metricName="combined_ratio"
        value={avgCombinedRatio}
        tooltip="Industry average combined ratio — the efficiency bar your product needs to beat"
      />
      <KpiCard
        title="Avg Expense Ratio"
        metricName="expense_ratio"
        value={avgExpenseRatio}
        tooltip="Industry average expense ratio — where AI automation creates the biggest margin gains"
      />
    </div>
  );
}
