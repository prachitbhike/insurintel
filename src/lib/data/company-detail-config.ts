import { type Sector } from "@/types/database";

export interface DetailSection {
  id: string;
  label: string;
  sectors: Sector[] | "all";
}

export const DETAIL_SECTIONS: DetailSection[] = [
  { id: "snapshot", label: "Snapshot", sectors: "all" },
  {
    id: "profitability",
    label: "Profitability",
    sectors: ["P&C", "Reinsurance", "Health", "Mortgage Insurance"],
  },
  { id: "efficiency", label: "Efficiency", sectors: "all" },
  { id: "tech-signals", label: "Tech Signals", sectors: "all" },
  { id: "investment", label: "Investment", sectors: "all" },
  { id: "financials", label: "Financials", sectors: "all" },
];

export function getSectionsForSector(sector: Sector): DetailSection[] {
  return DETAIL_SECTIONS.filter(
    (s) => s.sectors === "all" || s.sectors.includes(sector)
  );
}

/** Waterfall breakdown: which metrics stack to build combined ratio */
export const WATERFALL_METRICS: Record<
  string,
  { key: string; label: string; color: string }[]
> = {
  "P&C": [
    { key: "loss_ratio", label: "Loss Ratio", color: "hsl(0 72% 51%)" },
    { key: "expense_ratio", label: "Expense Ratio", color: "hsl(45 93% 47%)" },
  ],
  Reinsurance: [
    { key: "loss_ratio", label: "Loss Ratio", color: "hsl(0 72% 51%)" },
    { key: "expense_ratio", label: "Expense Ratio", color: "hsl(45 93% 47%)" },
  ],
  "Mortgage Insurance": [
    { key: "loss_ratio", label: "Loss Ratio", color: "hsl(0 72% 51%)" },
    { key: "expense_ratio", label: "Expense Ratio", color: "hsl(45 93% 47%)" },
  ],
};

/** Radar chart dimensions per sector */
export interface RadarDimension {
  key: string;
  label: string;
  invert: boolean;
}

export const RADAR_DIMENSIONS: Record<string, RadarDimension[]> = {
  "P&C": [
    { key: "combined_ratio", label: "CR Discipline", invert: true },
    { key: "expense_ratio", label: "Expense Control", invert: true },
    { key: "roe", label: "ROE", invert: false },
    { key: "premium_growth_yoy", label: "Growth", invert: false },
    { key: "roa", label: "ROA", invert: false },
  ],
  Reinsurance: [
    { key: "combined_ratio", label: "CR Discipline", invert: true },
    { key: "loss_ratio", label: "Loss Selection", invert: true },
    { key: "expense_ratio", label: "Expense Control", invert: true },
    { key: "roe", label: "ROE", invert: false },
    { key: "premium_growth_yoy", label: "Growth", invert: false },
  ],
  Health: [
    { key: "medical_loss_ratio", label: "MLR Efficiency", invert: true },
    { key: "roe", label: "ROE", invert: false },
    { key: "roa", label: "ROA", invert: false },
    { key: "debt_to_equity", label: "Low Leverage", invert: true },
    { key: "eps", label: "EPS", invert: false },
  ],
  Life: [
    { key: "roe", label: "ROE", invert: false },
    { key: "roa", label: "ROA", invert: false },
    { key: "investment_income", label: "Invest. Income", invert: false },
    { key: "debt_to_equity", label: "Low Leverage", invert: true },
    { key: "book_value_per_share", label: "BVPS", invert: false },
  ],
  Brokers: [
    { key: "roe", label: "ROE", invert: false },
    { key: "roa", label: "ROA", invert: false },
    { key: "eps", label: "EPS", invert: false },
    { key: "debt_to_equity", label: "Low Leverage", invert: true },
    { key: "net_income", label: "Net Income", invert: false },
  ],
  Title: [
    { key: "roe", label: "ROE", invert: false },
    { key: "roa", label: "ROA", invert: false },
    { key: "eps", label: "EPS", invert: false },
    { key: "debt_to_equity", label: "Low Leverage", invert: true },
    { key: "net_income", label: "Net Income", invert: false },
  ],
  "Mortgage Insurance": [
    { key: "combined_ratio", label: "CR Discipline", invert: true },
    { key: "loss_ratio", label: "Loss Selection", invert: true },
    { key: "expense_ratio", label: "Expense Control", invert: true },
    { key: "roe", label: "ROE", invert: false },
    { key: "book_value_per_share", label: "BVPS", invert: false },
  ],
};

/** Investment profile chart metrics per sector */
export interface InvestmentMetricConfig {
  key: string;
  label: string;
  chartType: "area" | "line" | "bar";
}

export const INVESTMENT_METRICS: Record<string, InvestmentMetricConfig[]> = {
  "P&C": [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "investment_income", label: "Investment Income", chartType: "bar" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
  ],
  Reinsurance: [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "investment_income", label: "Investment Income", chartType: "bar" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
  ],
  Health: [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
    { key: "eps", label: "Earnings Per Share", chartType: "bar" },
  ],
  Life: [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "investment_income", label: "Investment Income", chartType: "bar" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
  ],
  Brokers: [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
    { key: "eps", label: "Earnings Per Share", chartType: "bar" },
  ],
  Title: [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
    { key: "eps", label: "Earnings Per Share", chartType: "bar" },
  ],
  "Mortgage Insurance": [
    { key: "roe", label: "Return on Equity", chartType: "area" },
    { key: "book_value_per_share", label: "Book Value / Share", chartType: "line" },
    { key: "investment_income", label: "Investment Income", chartType: "bar" },
    { key: "debt_to_equity", label: "Debt-to-Equity", chartType: "line" },
  ],
};

/** Sector theme colors for charts */
export const SECTOR_CHART_COLORS: Record<Sector, string> = {
  "P&C": "hsl(217 91% 60%)",
  Life: "hsl(160 84% 39%)",
  Health: "hsl(263 70% 50%)",
  Reinsurance: "hsl(45 93% 47%)",
  Brokers: "hsl(350 89% 60%)",
  Title: "hsl(173 80% 40%)",
  "Mortgage Insurance": "hsl(239 84% 67%)",
};

export const SECTOR_CHART_COLORS_MUTED: Record<Sector, string> = {
  "P&C": "hsl(217 91% 60% / 0.2)",
  Life: "hsl(160 84% 39% / 0.2)",
  Health: "hsl(263 70% 50% / 0.2)",
  Reinsurance: "hsl(45 93% 47% / 0.2)",
  Brokers: "hsl(350 89% 60% / 0.2)",
  Title: "hsl(173 80% 40% / 0.2)",
  "Mortgage Insurance": "hsl(239 84% 67% / 0.2)",
};
