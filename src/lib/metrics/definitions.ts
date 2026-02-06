import { type MetricDefinition } from "@/types/metric";

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  net_premiums_earned: {
    name: "net_premiums_earned",
    label: "Net Premiums Earned",
    description:
      "Total premiums earned after reinsurance cessions. The core revenue for underwriting companies.",
    unit: "currency",
    category: "premiums",
    applicable_sectors: ["P&C", "Life", "Reinsurance"],
    higher_is_better: true,
    format_decimals: 0,
  },
  losses_incurred: {
    name: "losses_incurred",
    label: "Losses Incurred",
    description:
      "Total claims and loss adjustment expenses paid or reserved during the period.",
    unit: "currency",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 0,
  },
  loss_ratio: {
    name: "loss_ratio",
    label: "Loss Ratio",
    description:
      "Losses incurred as a percentage of net premiums earned. Lower is better — indicates better risk selection.",
    unit: "percent",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 1,
    founder_insight: "AI claims triage and fraud detection directly attack loss ratio. Every point of reduction on a large book is worth hundreds of millions.",
  },
  expense_ratio: {
    name: "expense_ratio",
    label: "Expense Ratio",
    description:
      "Underwriting expenses as a percentage of net premiums earned. Lower means more efficient operations.",
    unit: "percent",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 1,
    founder_insight: "The gap between worst and best-in-class expense ratios represents tens of billions in addressable AI automation spend.",
  },
  combined_ratio: {
    name: "combined_ratio",
    label: "Combined Ratio",
    description:
      "Sum of loss ratio and expense ratio. Below 100% means underwriting profit; above 100% means underwriting loss.",
    unit: "percent",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 1,
    founder_insight: "Companies above 100% are losing money on core operations — your strongest prospects for AI-driven cost reduction.",
  },
  net_income: {
    name: "net_income",
    label: "Net Income",
    description: "Total profit after all expenses, taxes, and adjustments.",
    unit: "currency",
    category: "profitability",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 0,
  },
  roe: {
    name: "roe",
    label: "Return on Equity",
    description:
      "Net income divided by shareholders' equity. Measures how efficiently a company generates profit from shareholder capital.",
    unit: "percent",
    category: "profitability",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 1,
    founder_insight: "Low and declining ROE creates board-level pressure to adopt technology solutions. Target companies below sector average.",
  },
  roa: {
    name: "roa",
    label: "Return on Assets",
    description:
      "Net income divided by total assets. Measures overall asset efficiency.",
    unit: "percent",
    category: "profitability",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 2,
  },
  eps: {
    name: "eps",
    label: "Earnings Per Share",
    description: "Net income divided by shares outstanding.",
    unit: "per_share",
    category: "profitability",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 2,
  },
  total_assets: {
    name: "total_assets",
    label: "Total Assets",
    description: "Sum of all company assets on the balance sheet.",
    unit: "currency",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 0,
  },
  stockholders_equity: {
    name: "stockholders_equity",
    label: "Stockholders' Equity",
    description: "Total assets minus total liabilities.",
    unit: "currency",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 0,
  },
  book_value_per_share: {
    name: "book_value_per_share",
    label: "Book Value / Share",
    description:
      "Stockholders' equity divided by shares outstanding. Measures per-share net asset value.",
    unit: "per_share",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: true,
    format_decimals: 2,
  },
  debt_to_equity: {
    name: "debt_to_equity",
    label: "Debt-to-Equity",
    description:
      "Total debt divided by stockholders' equity. Higher values indicate more leverage.",
    unit: "ratio",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: false,
    format_decimals: 2,
  },
  investment_income: {
    name: "investment_income",
    label: "Investment Income",
    description:
      "Income earned from the company's investment portfolio (bonds, equities, etc.).",
    unit: "currency",
    category: "profitability",
    applicable_sectors: ["P&C", "Life", "Reinsurance"],
    higher_is_better: true,
    format_decimals: 0,
  },
  revenue: {
    name: "revenue",
    label: "Revenue",
    description: "Total revenue from all sources.",
    unit: "currency",
    category: "profitability",
    applicable_sectors: ["Health", "Brokers"],
    higher_is_better: true,
    format_decimals: 0,
  },
  total_debt: {
    name: "total_debt",
    label: "Total Debt",
    description: "Sum of short-term and long-term debt obligations.",
    unit: "currency",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: false,
    format_decimals: 0,
  },
  shares_outstanding: {
    name: "shares_outstanding",
    label: "Shares Outstanding",
    description: "Total number of shares of common stock outstanding.",
    unit: "number",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: false,
    format_decimals: 0,
  },
  premium_growth_yoy: {
    name: "premium_growth_yoy",
    label: "Premium Growth (YoY)",
    description:
      "Year-over-year growth rate in net premiums earned. Indicates market share expansion.",
    unit: "percent",
    category: "premiums",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: true,
    format_decimals: 1,
  },
  medical_loss_ratio: {
    name: "medical_loss_ratio",
    label: "Medical Loss Ratio",
    description:
      "Medical claims expense divided by premium revenue. ACA requires minimum 80-85% MLR.",
    unit: "percent",
    category: "health",
    applicable_sectors: ["Health"],
    higher_is_better: false,
    format_decimals: 1,
    founder_insight: "ACA floors mean payers can only improve margins on the admin side (15-20% of premiums). This is where AI delivers most value.",
  },
  acquisition_costs: {
    name: "acquisition_costs",
    label: "Acquisition Costs",
    description:
      "Costs incurred to acquire new policies, including commissions and marketing.",
    unit: "currency",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 0,
  },
  underwriting_expenses: {
    name: "underwriting_expenses",
    label: "Underwriting Expenses",
    description:
      "Operating expenses related to underwriting activities.",
    unit: "currency",
    category: "underwriting",
    applicable_sectors: ["P&C", "Reinsurance"],
    higher_is_better: false,
    format_decimals: 0,
  },
  medical_claims_expense: {
    name: "medical_claims_expense",
    label: "Medical Claims Expense",
    description: "Total medical claims and benefits paid to members.",
    unit: "currency",
    category: "health",
    applicable_sectors: ["Health"],
    higher_is_better: false,
    format_decimals: 0,
  },
  total_liabilities: {
    name: "total_liabilities",
    label: "Total Liabilities",
    description: "Sum of all company liabilities.",
    unit: "currency",
    category: "balance_sheet",
    applicable_sectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    higher_is_better: false,
    format_decimals: 0,
  },
};

export function getMetricDefinition(
  name: string
): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[name];
}

export function getMetricsForSector(
  sector: string
): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((m) =>
    m.applicable_sectors.includes(sector as MetricDefinition["applicable_sectors"][number])
  );
}
