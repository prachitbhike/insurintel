import { type Sector } from "@/types/database";

export interface SectorStoryConfig {
  title: string;
  metric: string;
  description: string;
  higherIsBetter: boolean;
}

export const SECTOR_CHART_CONFIG: Record<Sector, SectorStoryConfig> = {
  "P&C": {
    title: "Expense Efficiency Rankings",
    metric: "expense_ratio",
    description: "Expense ratio per company, sorted. Lower is more efficient.",
    higherIsBetter: false,
  },
  Health: {
    title: "Admin Margin Pool",
    metric: "medical_loss_ratio",
    description: "Medical loss ratio per company. Lower MLR = more admin margin for AI impact.",
    higherIsBetter: false,
  },
  Life: {
    title: "Capital Efficiency",
    metric: "roe",
    description: "Return on equity per company. Higher ROE = more efficient capital deployment.",
    higherIsBetter: true,
  },
  Reinsurance: {
    title: "Underwriting Discipline",
    metric: "combined_ratio",
    description: "Combined ratio per company. Below 100% = underwriting profit.",
    higherIsBetter: false,
  },
  Brokers: {
    title: "Leverage Ladder",
    metric: "debt_to_equity",
    description: "Debt-to-equity per broker. Higher leverage = more acquisition debt.",
    higherIsBetter: false,
  },
  Title: {
    title: "Capital Efficiency",
    metric: "roe",
    description: "Return on equity per title insurer. Higher ROE = more efficient capital deployment.",
    higherIsBetter: true,
  },
  "Mortgage Insurance": {
    title: "Underwriting Discipline",
    metric: "combined_ratio",
    description: "Combined ratio per MI company. Below 100% = underwriting profit.",
    higherIsBetter: false,
  },
};

export function getSectorStoryMetric(sectorName: Sector): string {
  return SECTOR_CHART_CONFIG[sectorName]?.metric ?? "roe";
}
