import { type KpiValue, type PeerComparison } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";

/**
 * Generate quick-take sentences comparing company performance vs sector peers.
 */
export function generateQuickTake(
  companyName: string,
  sector: string,
  comparisons: PeerComparison[],
  kpis: KpiValue[],
): string[] {
  const sentences: string[] = [];
  const validComparisons = comparisons.filter(
    (c) => c.company_value != null && c.sector_avg != null,
  );

  if (validComparisons.length === 0) return sentences;

  const scored = validComparisons.map((c) => {
    const def = METRIC_DEFINITIONS[c.metric_name];
    const diff = c.company_value! - c.sector_avg!;
    const absDiff =
      Math.abs(c.sector_avg!) > 0
        ? Math.abs(diff / c.sector_avg!) * 100
        : 0;
    const isBetter = def?.higher_is_better ? diff > 0 : diff < 0;
    return { ...c, def, absDiff, isBetter };
  });

  // Top strength
  const strengths = scored
    .filter((s) => s.isBetter)
    .sort((a, b) => b.absDiff - a.absDiff);
  if (strengths.length > 0) {
    const s = strengths[0];
    const label = s.def?.label ?? s.metric_name.replace(/_/g, " ");
    sentences.push(
      `${companyName} leads its ${sector} peers with a ${label.toLowerCase()} of ${formatMetricValue(s.metric_name, s.company_value)}, vs the sector average of ${formatMetricValue(s.metric_name, s.sector_avg)}.`,
    );
  }

  // Top weakness
  const weaknesses = scored
    .filter((s) => !s.isBetter)
    .sort((a, b) => b.absDiff - a.absDiff);
  if (weaknesses.length > 0) {
    const w = weaknesses[0];
    const label = w.def?.label ?? w.metric_name.replace(/_/g, " ");
    const rankStr =
      w.rank != null && w.total != null
        ? `, ranking #${w.rank} of ${w.total}`
        : "";
    sentences.push(
      `Its ${label.toLowerCase()} of ${formatMetricValue(w.metric_name, w.company_value)} trails the sector average of ${formatMetricValue(w.metric_name, w.sector_avg)}${rankStr}.`,
    );
  }

  // YoY trend from KPIs
  const kpisWithChange = kpis.filter(
    (k) => k.change_pct != null && Math.abs(k.change_pct) >= 1,
  );
  if (kpisWithChange.length > 0) {
    const biggest = kpisWithChange.sort(
      (a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!),
    )[0];
    const def = METRIC_DEFINITIONS[biggest.metric_name];
    const label = def?.label ?? biggest.metric_name.replace(/_/g, " ");
    const direction = biggest.change_pct! > 0 ? "increased" : "decreased";
    sentences.push(
      `${label} has ${direction} ${Math.abs(biggest.change_pct!).toFixed(1)}% year-over-year.`,
    );
  }

  return sentences;
}

/**
 * Compute opportunity panel data: pain metric, sector benchmarks, and savings estimate.
 */
export function computeOpportunityData(
  sector: string,
  metrics: Record<string, number | null>,
  sectorAvgsRecord: Record<string, number | null>,
  sectorMinsRecord: Record<string, number | null>,
  sectorMaxesRecord: Record<string, number | null>,
) {
  const PAIN_CONFIG: Record<
    string,
    { metric: string; label: string; lowerIsBetter: boolean }
  > = {
    "P&C": {
      metric: "expense_ratio",
      label: "Expense Ratio",
      lowerIsBetter: true,
    },
    Reinsurance: {
      metric: "expense_ratio",
      label: "Expense Ratio",
      lowerIsBetter: true,
    },
    Health: {
      metric: "medical_loss_ratio",
      label: "Medical Loss Ratio",
      lowerIsBetter: true,
    },
    Life: {
      metric: "roe",
      label: "Return on Equity",
      lowerIsBetter: false,
    },
    Brokers: {
      metric: "debt_to_equity",
      label: "Debt-to-Equity",
      lowerIsBetter: true,
    },
    Title: {
      metric: "roe",
      label: "Return on Equity",
      lowerIsBetter: false,
    },
    "Mortgage Insurance": {
      metric: "expense_ratio",
      label: "Expense Ratio",
      lowerIsBetter: true,
    },
  };

  const config = PAIN_CONFIG[sector];
  if (!config)
    return {
      painMetricName: null as string | null,
      painMetricLabel: "",
      painMetricValue: null as number | null,
      sectorAvgPainMetric: null as number | null,
      sectorBestPainMetric: null as number | null,
      automationSavings: null as number | null,
    };

  const painMetricValue = metrics[config.metric] ?? null;
  const sectorAvgPainMetric = sectorAvgsRecord[config.metric] ?? null;

  const sectorBestPainMetric = config.lowerIsBetter
    ? (sectorMinsRecord[config.metric] ?? null)
    : (sectorMaxesRecord[config.metric] ?? null);

  let automationSavings: number | null = null;
  if (painMetricValue != null && sectorBestPainMetric != null) {
    const premiums =
      metrics["net_premiums_earned"] ?? metrics["revenue"] ?? null;

    if (sector === "P&C" || sector === "Reinsurance" || sector === "Mortgage Insurance") {
      const gap = painMetricValue - sectorBestPainMetric;
      if (gap > 0 && premiums != null) {
        automationSavings = (gap / 100) * premiums;
      }
    } else if (sector === "Health") {
      const adminRatio = 1 - painMetricValue / 100;
      const bestAdminRatio = 1 - sectorBestPainMetric / 100;
      const gap = adminRatio - bestAdminRatio;
      if (gap > 0 && premiums != null) {
        automationSavings = gap * premiums;
      }
    }
  }

  return {
    painMetricName: config.metric,
    painMetricLabel: config.label,
    painMetricValue,
    sectorAvgPainMetric,
    sectorBestPainMetric,
    automationSavings,
  };
}
