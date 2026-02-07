import { type Sector } from "@/types/database";

export interface HeroStat {
  title: string;
  metricName: string;
  aggregation: "sum" | "avg" | "spread";
  tooltip: string;
}

export interface OpportunityMetric {
  metric: string;
  label: string;
}

export interface SectorInfo {
  name: Sector;
  slug: string;
  label: string;
  description: string;
  color: string;
  key_metrics: string[];
  ai_opportunities: string[];
  hero_stats: HeroStat[];
  opportunity_metrics: [OpportunityMetric, OpportunityMetric];
}

export const SECTORS: SectorInfo[] = [
  {
    name: "P&C",
    slug: "p-and-c",
    label: "Property & Casualty",
    description:
      "Companies providing property, auto, commercial, and specialty insurance lines.",
    color: "bg-blue-500",
    key_metrics: [
      "combined_ratio",
      "loss_ratio",
      "expense_ratio",
      "net_premiums_earned",
      "roe",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Premiums",
        metricName: "net_premiums_earned",
        aggregation: "sum",
        tooltip: "Total net premiums earned across P&C insurers",
      },
      {
        title: "Combined",
        metricName: "combined_ratio",
        aggregation: "avg",
        tooltip: "Average combined ratio — below 100% means underwriting profit",
      },
      {
        title: "Expense",
        metricName: "expense_ratio",
        aggregation: "avg",
        tooltip: "Average expense ratio across P&C insurers",
      },
      {
        title: "Spread",
        metricName: "expense_ratio",
        aggregation: "spread",
        tooltip: "Gap between the most and least efficient insurer in the sector",
      },
    ],
    opportunity_metrics: [
      { metric: "expense_ratio", label: "Expense Ratio" },
      { metric: "premium_growth_yoy", label: "Premium Growth" },
    ],
  },
  {
    name: "Life",
    slug: "life",
    label: "Life Insurance",
    description:
      "Companies providing life insurance, annuities, and retirement products.",
    color: "bg-emerald-500",
    key_metrics: [
      "net_income",
      "roe",
      "roa",
      "book_value_per_share",
      "total_assets",
      "investment_income",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Assets",
        metricName: "total_assets",
        aggregation: "sum",
        tooltip: "Combined assets under management across Life insurers",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity — how efficiently capital generates profit",
      },
      {
        title: "Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across Life insurers",
      },
      {
        title: "Book Value",
        metricName: "book_value_per_share",
        aggregation: "avg",
        tooltip: "Average book value per share — equity tied up per share",
      },
    ],
    opportunity_metrics: [
      { metric: "roe", label: "ROE" },
      { metric: "net_premiums_earned", label: "Premiums" },
    ],
  },
  {
    name: "Health",
    slug: "health",
    label: "Health Insurance",
    description:
      "Managed care and health insurance companies providing medical coverage.",
    color: "bg-violet-500",
    key_metrics: [
      "medical_loss_ratio",
      "revenue",
      "net_income",
      "roe",
      "eps",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Revenue",
        metricName: "revenue",
        aggregation: "sum",
        tooltip: "Total revenue across Health insurers",
      },
      {
        title: "Avg MLR",
        metricName: "medical_loss_ratio",
        aggregation: "avg",
        tooltip: "ACA requires 80-85% MLR floor — admin margin is what's left",
      },
      {
        title: "Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across Health insurers",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity across managed care",
      },
    ],
    opportunity_metrics: [
      { metric: "medical_loss_ratio", label: "MLR" },
      { metric: "roe", label: "ROE" },
    ],
  },
  {
    name: "Reinsurance",
    slug: "reinsurance",
    label: "Reinsurance",
    description:
      "Companies providing insurance to other insurance companies.",
    color: "bg-amber-500",
    key_metrics: [
      "combined_ratio",
      "loss_ratio",
      "expense_ratio",
      "net_premiums_earned",
      "roe",
      "book_value_per_share",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Premiums",
        metricName: "net_premiums_earned",
        aggregation: "sum",
        tooltip: "Total net premiums earned across reinsurers",
      },
      {
        title: "Combined",
        metricName: "combined_ratio",
        aggregation: "avg",
        tooltip: "Average combined ratio — underwriting discipline benchmark",
      },
      {
        title: "Loss Ratio",
        metricName: "loss_ratio",
        aggregation: "avg",
        tooltip: "Average loss ratio — quality of risk selection",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity — capital efficiency",
      },
    ],
    opportunity_metrics: [
      { metric: "expense_ratio", label: "Expense Ratio" },
      { metric: "premium_growth_yoy", label: "Premium Growth" },
    ],
  },
  {
    name: "Brokers",
    slug: "brokers",
    label: "Insurance Brokers",
    description:
      "Companies that act as intermediaries between insurance buyers and carriers.",
    color: "bg-rose-500",
    key_metrics: ["revenue", "net_income", "roe", "eps", "debt_to_equity"],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Revenue",
        metricName: "revenue",
        aggregation: "sum",
        tooltip: "Total revenue (commissions + fees) across brokers",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity across brokers",
      },
      {
        title: "Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across brokers",
      },
      {
        title: "Avg D/E",
        metricName: "debt_to_equity",
        aggregation: "avg",
        tooltip: "Average leverage ratio — acquisition-fueled debt",
      },
    ],
    opportunity_metrics: [
      { metric: "roe", label: "ROE" },
      { metric: "revenue", label: "Revenue" },
    ],
  },
  {
    name: "Title",
    slug: "title",
    label: "Title Insurance",
    description:
      "Companies providing title search, insurance, and settlement services for real estate transactions.",
    color: "bg-teal-500",
    key_metrics: [
      "revenue",
      "net_income",
      "roe",
      "roa",
      "eps",
      "total_assets",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Revenue",
        metricName: "revenue",
        aggregation: "sum",
        tooltip: "Total revenue across title insurers",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity across title insurers",
      },
      {
        title: "Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across title insurers",
      },
      {
        title: "Avg ROA",
        metricName: "roa",
        aggregation: "avg",
        tooltip: "Average return on assets across title insurers",
      },
    ],
    opportunity_metrics: [
      { metric: "roe", label: "ROE" },
      { metric: "revenue", label: "Revenue" },
    ],
  },
  {
    name: "Mortgage Insurance",
    slug: "mortgage-insurance",
    label: "Mortgage Insurance",
    description:
      "Companies providing private mortgage insurance that protects lenders against borrower default.",
    color: "bg-indigo-500",
    key_metrics: [
      "combined_ratio",
      "loss_ratio",
      "expense_ratio",
      "net_income",
      "roe",
      "book_value_per_share",
    ],
    ai_opportunities: [],
    hero_stats: [
      {
        title: "Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across MI companies",
      },
      {
        title: "Avg ROE",
        metricName: "roe",
        aggregation: "avg",
        tooltip: "Average return on equity across MI companies",
      },
      {
        title: "Loss Ratio",
        metricName: "loss_ratio",
        aggregation: "avg",
        tooltip: "Average loss ratio across MI companies",
      },
      {
        title: "Combined",
        metricName: "combined_ratio",
        aggregation: "avg",
        tooltip: "Average combined ratio across MI companies",
      },
    ],
    opportunity_metrics: [
      { metric: "expense_ratio", label: "Expense Ratio" },
      { metric: "roe", label: "ROE" },
    ],
  },
];

export function getSectorBySlug(slug: string): SectorInfo | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

export function getSectorByName(name: Sector): SectorInfo | undefined {
  return SECTORS.find((s) => s.name === name);
}

export function getSectorSlug(name: Sector): string {
  return SECTORS.find((s) => s.name === name)?.slug ?? name.toLowerCase();
}
