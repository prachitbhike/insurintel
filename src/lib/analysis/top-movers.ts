import { type Sector } from "@/types/database";
import { type BulkScoringData } from "@/lib/scoring/types";

export interface TopMover {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  metricName: string;
  metricLabel: string;
  priorValue: number;
  currentValue: number;
  deltaAbs: number;
  direction: "deteriorating" | "improving";
}

const SECTOR_PAIN_METRIC: Record<Sector, { metric: string; label: string; invertDirection: boolean }> = {
  "P&C": { metric: "combined_ratio", label: "Combined Ratio", invertDirection: false },
  Reinsurance: { metric: "combined_ratio", label: "Combined Ratio", invertDirection: false },
  Health: { metric: "medical_loss_ratio", label: "MLR", invertDirection: false },
  Life: { metric: "roe", label: "ROE", invertDirection: true }, // declining ROE = deteriorating
  Brokers: { metric: "roe", label: "ROE", invertDirection: true },
};

export function computeTopMovers(
  data: BulkScoringData
): { deteriorating: TopMover[]; improving: TopMover[] } {
  const movers: TopMover[] = [];

  for (const company of data.companies) {
    const config = SECTOR_PAIN_METRIC[company.sector];
    if (!config) continue;

    const ts = data.timeseries[company.id]?.[config.metric];
    if (!ts || ts.length < 2) continue;

    const sorted = [...ts].sort((a, b) => b.fiscal_year - a.fiscal_year);
    const current = sorted[0];
    const prior = sorted[1];

    const delta = current.value - prior.value;
    if (Math.abs(delta) < 0.01) continue;

    // For ratios (CR, MLR): positive delta = deteriorating (higher = worse)
    // For ROE (inverted): negative delta = deteriorating (lower = worse)
    const isDeteriorating = config.invertDirection ? delta < 0 : delta > 0;

    movers.push({
      companyId: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
      metricName: config.metric,
      metricLabel: config.label,
      priorValue: prior.value,
      currentValue: current.value,
      deltaAbs: Math.abs(delta),
      direction: isDeteriorating ? "deteriorating" : "improving",
    });
  }

  const deteriorating = movers
    .filter((m) => m.direction === "deteriorating")
    .sort((a, b) => b.deltaAbs - a.deltaAbs)
    .slice(0, 6);

  const improving = movers
    .filter((m) => m.direction === "improving")
    .sort((a, b) => b.deltaAbs - a.deltaAbs)
    .slice(0, 6);

  return { deteriorating, improving };
}
