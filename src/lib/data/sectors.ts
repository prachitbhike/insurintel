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
    ai_opportunities: [
      "Automated claims triage and straight-through processing can cut loss adjustment expenses 20-40%",
      "ML-driven underwriting models replace manual risk selection, especially in commercial lines",
      "Computer vision for property damage assessment eliminates field adjuster visits",
      "Telematics and IoT data enable real-time risk pricing that incumbents are slow to adopt",
    ],
    hero_stats: [
      {
        title: "Sector Premiums",
        metricName: "net_premiums_earned",
        aggregation: "sum",
        tooltip: "Total net premiums earned across P&C insurers",
      },
      {
        title: "Avg Combined Ratio",
        metricName: "combined_ratio",
        aggregation: "avg",
        tooltip: "Average combined ratio — below 100% means underwriting profit",
      },
      {
        title: "Avg Expense Ratio",
        metricName: "expense_ratio",
        aggregation: "avg",
        tooltip: "Average expense ratio — the piece most vulnerable to automation",
      },
      {
        title: "Best-to-Worst Spread",
        metricName: "expense_ratio",
        aggregation: "spread",
        tooltip: "Gap between the most and least efficient insurer — this is the opportunity window",
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
    ],
    ai_opportunities: [
      "Accelerated underwriting using health data APIs and predictive models replaces paramedical exams",
      "AI-powered financial planning tools increase annuity and retirement product cross-sell",
      "NLP-driven policy servicing automates beneficiary changes, loans, and surrender processing",
      "Fraud detection models for life claims reduce investigation costs and payout leakage",
    ],
    hero_stats: [
      {
        title: "Total Assets",
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
        title: "Total Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across Life insurers",
      },
      {
        title: "Avg Book Value/Share",
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
    ai_opportunities: [
      "Prior authorization automation reduces admin burden — the #1 cost driver in managed care",
      "Predictive analytics for high-risk member identification enables early intervention programs",
      "AI-assisted claims adjudication can process routine medical claims in seconds vs. days",
      "NLP extraction from clinical notes improves risk adjustment coding accuracy and revenue capture",
    ],
    hero_stats: [
      {
        title: "Sector Revenue",
        metricName: "revenue",
        aggregation: "sum",
        tooltip: "Total revenue across Health insurers",
      },
      {
        title: "Avg Medical Loss Ratio",
        metricName: "medical_loss_ratio",
        aggregation: "avg",
        tooltip: "ACA requires 80-85% MLR floor — admin margin is what's left",
      },
      {
        title: "Total Net Income",
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
      "net_premiums_earned",
      "roe",
      "book_value_per_share",
    ],
    ai_opportunities: [
      "Catastrophe modeling with ML improves loss estimates and capital allocation for nat-cat treaties",
      "Automated treaty placement and pricing engines reduce broker dependency and speed renewals",
      "Real-time portfolio monitoring using satellite and IoT data enables dynamic exposure management",
      "AI-driven claims reserving models reduce reserve volatility and improve capital efficiency",
    ],
    hero_stats: [
      {
        title: "Sector Premiums",
        metricName: "net_premiums_earned",
        aggregation: "sum",
        tooltip: "Total net premiums earned across reinsurers",
      },
      {
        title: "Avg Combined Ratio",
        metricName: "combined_ratio",
        aggregation: "avg",
        tooltip: "Average combined ratio — underwriting discipline benchmark",
      },
      {
        title: "Avg Loss Ratio",
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
  },
  {
    name: "Brokers",
    slug: "brokers",
    label: "Insurance Brokers",
    description:
      "Companies that act as intermediaries between insurance buyers and carriers.",
    color: "bg-rose-500",
    key_metrics: ["revenue", "net_income", "roe", "eps", "debt_to_equity"],
    ai_opportunities: [
      "AI-powered quote comparison and placement engines threaten the traditional broker value prop",
      "Automated renewal processing and policy checking reduces E&O risk and back-office headcount",
      "Predictive cross-sell models identify coverage gaps across client portfolios",
      "Digital-first distribution platforms can undercut broker commissions on small commercial lines",
    ],
    hero_stats: [
      {
        title: "Sector Revenue",
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
        title: "Total Net Income",
        metricName: "net_income",
        aggregation: "sum",
        tooltip: "Combined profit pool across brokers",
      },
      {
        title: "Avg Debt-to-Equity",
        metricName: "debt_to_equity",
        aggregation: "avg",
        tooltip: "Average leverage ratio — acquisition-fueled debt",
      },
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
