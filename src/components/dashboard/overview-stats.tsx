import { KpiCard } from "./kpi-card";

interface OverviewStatsProps {
  totalCompanies: number;
  avgCombinedRatio: number | null;
  avgRoe: number | null;
  avgPremiumGrowth: number | null;
}

export function OverviewStats({
  totalCompanies,
  avgCombinedRatio,
  avgRoe,
  avgPremiumGrowth,
}: OverviewStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Companies Tracked"
        metricName="companies_count"
        value={totalCompanies}
        tooltip="Total number of active insurance companies in the database."
      />
      <KpiCard
        title="Avg Combined Ratio"
        metricName="combined_ratio"
        value={avgCombinedRatio}
        tooltip="Average combined ratio across all P&C and Reinsurance companies. Below 100% indicates underwriting profit."
      />
      <KpiCard
        title="Avg Return on Equity"
        metricName="roe"
        value={avgRoe}
        tooltip="Average ROE across all tracked insurance companies."
      />
      <KpiCard
        title="Avg Premium Growth"
        metricName="premium_growth_yoy"
        value={avgPremiumGrowth}
        tooltip="Average year-over-year premium growth across P&C and Reinsurance companies."
      />
    </div>
  );
}
