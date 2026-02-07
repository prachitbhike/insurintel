import { type Sector } from "@/types/database";
import { type LucideIcon, DollarSign, TrendingUp, Users, Activity, BarChart3, PieChart, Landmark } from "lucide-react";

// ── Column definition for Target List tables ──────────────────────────

export interface TargetColumnDef {
  key: string;
  label: string;
  metric?: string;
  format: "currency" | "percent" | "ratio" | "per_share" | "number";
  hasBarIndicator?: boolean;
  hasSparkline?: boolean;
  hasQuartileColor?: boolean;
  peerDiffMetric?: string;
}

// ── Tab configuration per sector ──────────────────────────────────────

export interface SectorTabConfig {
  tab1: {
    name: string;
    icon: LucideIcon;
  };
  tab2: {
    name: string;
    icon: LucideIcon;
    primaryMetric: string;
    primaryLabel: string;
    secondaryMetric: string;
    secondaryLabel: string;
    higherIsWorse: boolean;
  };
  tab3: {
    name: string;
    icon: LucideIcon;
    columns: TargetColumnDef[];
    csvFilename: string;
  };
}

// ── Per-sector configurations ──────────────────────────────────────────

export const SECTOR_DASHBOARD_CONFIG: Record<Sector, SectorTabConfig> = {
  "P&C": {
    tab1: { name: "Cost Breakdown", icon: DollarSign },
    tab2: {
      name: "Expense Trends",
      icon: TrendingUp,
      primaryMetric: "expense_ratio",
      primaryLabel: "Expense Ratio",
      secondaryMetric: "loss_ratio",
      secondaryLabel: "Loss Ratio",
      higherIsWorse: true,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "pc-target-list.csv",
      columns: [
        { key: "net_premiums", label: "Net Premiums", metric: "net_premiums_earned", format: "currency", hasBarIndicator: true },
        { key: "expense_trend", label: "Expense Trend", metric: "expense_ratio", format: "percent", hasSparkline: true },
        { key: "combined_vs_peers", label: "Combined vs Peers", format: "percent", peerDiffMetric: "combined_ratio" },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "premium_growth", label: "Growth", metric: "premium_growth_yoy", format: "percent" },
        { key: "expense_costs", label: "Expense $", format: "currency" },
      ],
    },
  },

  Reinsurance: {
    tab1: { name: "Cost Breakdown", icon: DollarSign },
    tab2: {
      name: "Loss Trends",
      icon: TrendingUp,
      primaryMetric: "loss_ratio",
      primaryLabel: "Loss Ratio",
      secondaryMetric: "combined_ratio",
      secondaryLabel: "Combined Ratio",
      higherIsWorse: true,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "reinsurance-target-list.csv",
      columns: [
        { key: "net_premiums", label: "Premiums", metric: "net_premiums_earned", format: "currency", hasBarIndicator: true },
        { key: "expense_trend", label: "Expense Trend", metric: "expense_ratio", format: "percent", hasSparkline: true },
        { key: "combined_vs_peers", label: "Combined vs Peers", format: "percent", peerDiffMetric: "combined_ratio" },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "premium_growth", label: "Growth", metric: "premium_growth_yoy", format: "percent" },
        { key: "expense_costs", label: "Expense $", format: "currency" },
      ],
    },
  },

  "Mortgage Insurance": {
    tab1: { name: "UW Performance", icon: Activity },
    tab2: {
      name: "Credit Cycle",
      icon: TrendingUp,
      primaryMetric: "combined_ratio",
      primaryLabel: "Combined Ratio",
      secondaryMetric: "loss_ratio",
      secondaryLabel: "Loss Ratio",
      higherIsWorse: true,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "mortgage-insurance-target-list.csv",
      columns: [
        { key: "combined_ratio", label: "Combined", metric: "combined_ratio", format: "percent" },
        { key: "loss_ratio", label: "Loss Ratio", metric: "loss_ratio", format: "percent" },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "bvps", label: "BVPS", metric: "book_value_per_share", format: "per_share" },
        { key: "net_income", label: "Net Income", metric: "net_income", format: "currency" },
      ],
    },
  },

  Health: {
    tab1: { name: "MLR Breakdown", icon: PieChart },
    tab2: {
      name: "Margin Trends",
      icon: TrendingUp,
      primaryMetric: "medical_loss_ratio",
      primaryLabel: "MLR",
      secondaryMetric: "roe",
      secondaryLabel: "ROE",
      higherIsWorse: true,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "health-target-list.csv",
      columns: [
        { key: "revenue", label: "Revenue", metric: "revenue", format: "currency", hasBarIndicator: true },
        { key: "mlr", label: "MLR", metric: "medical_loss_ratio", format: "percent" },
        { key: "admin_margin", label: "Admin Margin $", format: "currency" },
        { key: "mlr_trend", label: "MLR Trend", metric: "medical_loss_ratio", format: "percent", hasSparkline: true },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "eps", label: "EPS", metric: "eps", format: "per_share" },
      ],
    },
  },

  Life: {
    tab1: { name: "Capital Efficiency", icon: Landmark },
    tab2: {
      name: "Returns Trends",
      icon: TrendingUp,
      primaryMetric: "roe",
      primaryLabel: "ROE",
      secondaryMetric: "roa",
      secondaryLabel: "ROA",
      higherIsWorse: false,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "life-target-list.csv",
      columns: [
        { key: "total_assets", label: "Total Assets", metric: "total_assets", format: "currency", hasBarIndicator: true },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "roa", label: "ROA", metric: "roa", format: "percent" },
        { key: "investment_income", label: "Inv. Income", metric: "investment_income", format: "currency" },
        { key: "net_income", label: "Net Income", metric: "net_income", format: "currency" },
        { key: "bvps", label: "BVPS", metric: "book_value_per_share", format: "per_share" },
      ],
    },
  },

  Brokers: {
    tab1: { name: "Earnings Power", icon: BarChart3 },
    tab2: {
      name: "Leverage Trends",
      icon: TrendingUp,
      primaryMetric: "debt_to_equity",
      primaryLabel: "D/E Ratio",
      secondaryMetric: "roe",
      secondaryLabel: "ROE",
      higherIsWorse: true,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "brokers-target-list.csv",
      columns: [
        { key: "revenue", label: "Revenue", metric: "revenue", format: "currency", hasBarIndicator: true },
        { key: "net_income", label: "Net Income", metric: "net_income", format: "currency" },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "de", label: "D/E", metric: "debt_to_equity", format: "ratio" },
        { key: "eps", label: "EPS", metric: "eps", format: "per_share" },
      ],
    },
  },

  Title: {
    tab1: { name: "Revenue Efficiency", icon: DollarSign },
    tab2: {
      name: "Returns Trends",
      icon: TrendingUp,
      primaryMetric: "roe",
      primaryLabel: "ROE",
      secondaryMetric: "roa",
      secondaryLabel: "ROA",
      higherIsWorse: false,
    },
    tab3: {
      name: "Target List",
      icon: Users,
      csvFilename: "title-target-list.csv",
      columns: [
        { key: "revenue", label: "Revenue", metric: "revenue", format: "currency", hasBarIndicator: true },
        { key: "net_income", label: "Net Income", metric: "net_income", format: "currency" },
        { key: "roe", label: "ROE", metric: "roe", format: "percent", hasQuartileColor: true },
        { key: "roa", label: "ROA", metric: "roa", format: "percent" },
        { key: "eps", label: "EPS", metric: "eps", format: "per_share" },
      ],
    },
  },
};
