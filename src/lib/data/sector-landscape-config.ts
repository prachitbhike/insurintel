import { type Sector } from "@/types/database";

export interface LandscapeConfig {
  xMetric: string;
  xLabel: string;
  xHigherIsPain: boolean;
  yMetric: string;
  yLabel: string;
  zMetric: string;
  zLabel: string;
  quadrants: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
}

export const LANDSCAPE_CONFIG: Record<Sector, LandscapeConfig> = {
  "P&C": {
    xMetric: "expense_ratio",
    xLabel: "Expense Ratio",
    xHigherIsPain: true,
    yMetric: "premium_growth_yoy",
    yLabel: "Premium Growth (YoY %)",
    zMetric: "net_premiums_earned",
    zLabel: "Net Premiums Earned",
    quadrants: {
      topLeft: "Steady Ops",
      topRight: "Best Targets",
      bottomLeft: "Leaders",
      bottomRight: "Disruption",
    },
  },
  Health: {
    xMetric: "medical_loss_ratio",
    xLabel: "Medical Loss Ratio",
    xHigherIsPain: true,
    yMetric: "roe",
    yLabel: "ROE (%)",
    zMetric: "revenue",
    zLabel: "Revenue",
    quadrants: {
      topLeft: "Steady Ops",
      topRight: "Best Targets",
      bottomLeft: "Leaders",
      bottomRight: "Disruption",
    },
  },
  Life: {
    xMetric: "roe",
    xLabel: "ROE (inverted: low = right)",
    xHigherIsPain: false,
    yMetric: "net_income",
    yLabel: "Net Income",
    zMetric: "total_assets",
    zLabel: "Total Assets",
    quadrants: {
      topLeft: "Best Targets",
      topRight: "Steady Ops",
      bottomLeft: "Disruption",
      bottomRight: "Leaders",
    },
  },
  Reinsurance: {
    xMetric: "combined_ratio",
    xLabel: "Combined Ratio",
    xHigherIsPain: true,
    yMetric: "premium_growth_yoy",
    yLabel: "Premium Growth (YoY %)",
    zMetric: "net_premiums_earned",
    zLabel: "Net Premiums Earned",
    quadrants: {
      topLeft: "Steady Ops",
      topRight: "Best Targets",
      bottomLeft: "Leaders",
      bottomRight: "Disruption",
    },
  },
  Brokers: {
    xMetric: "debt_to_equity",
    xLabel: "Debt-to-Equity",
    xHigherIsPain: true,
    yMetric: "roe",
    yLabel: "ROE (%)",
    zMetric: "revenue",
    zLabel: "Revenue",
    quadrants: {
      topLeft: "Steady Ops",
      topRight: "Best Targets",
      bottomLeft: "Leaders",
      bottomRight: "Disruption",
    },
  },
  Title: {
    xMetric: "roe",
    xLabel: "ROE (inverted: low = right)",
    xHigherIsPain: false,
    yMetric: "revenue",
    yLabel: "Revenue",
    zMetric: "total_assets",
    zLabel: "Total Assets",
    quadrants: {
      topLeft: "Best Targets",
      topRight: "Steady Ops",
      bottomLeft: "Disruption",
      bottomRight: "Leaders",
    },
  },
  "Mortgage Insurance": {
    xMetric: "expense_ratio",
    xLabel: "Expense Ratio",
    xHigherIsPain: true,
    yMetric: "premium_growth_yoy",
    yLabel: "Premium Growth (YoY %)",
    zMetric: "net_premiums_earned",
    zLabel: "Net Premiums Earned",
    quadrants: {
      topLeft: "Steady Ops",
      topRight: "Best Targets",
      bottomLeft: "Leaders",
      bottomRight: "Disruption",
    },
  },
};
