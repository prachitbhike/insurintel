import { KpiCard } from "@/components/dashboard/kpi-card";
import { KpiExportButton } from "@/components/company-detail/kpi-export-button";
import { type KpiValue } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

interface KpiGridProps {
  kpis: KpiValue[];
  sector: string;
}

const KPI_LAYOUT = [
  ["net_premiums_earned", "combined_ratio", "loss_ratio", "expense_ratio"],
  ["net_income", "roe", "roa", "eps"],
  ["total_assets", "book_value_per_share", "debt_to_equity", "investment_income"],
];

export function KpiGrid({ kpis, sector }: KpiGridProps) {
  const kpiMap = new Map(kpis.map((k) => [k.metric_name, k]));

  return (
    <div className="space-y-4 group">
      <div className="flex items-center gap-2">
        <h2 className="sr-only">Key Performance Indicators</h2>
        <KpiExportButton kpis={kpis} />
      </div>
      {KPI_LAYOUT.map((row, i) => (
        <div key={i} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {row.map((metricName) => {
            const def = METRIC_DEFINITIONS[metricName];
            if (def && !def.applicable_sectors.includes(sector as never)) {
              return null;
            }
            const kpi = kpiMap.get(metricName);
            return (
              <KpiCard
                key={metricName}
                title={def?.label ?? metricName.replace(/_/g, " ")}
                metricName={metricName}
                value={kpi?.current_value ?? null}
                changePct={kpi?.change_pct ?? null}
                tooltip={def?.description}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
