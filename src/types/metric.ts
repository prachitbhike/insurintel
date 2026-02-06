import { type Sector } from "./database";

export type MetricCategory =
  | "underwriting"
  | "profitability"
  | "balance_sheet"
  | "premiums"
  | "health"
  | "broker";

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
  unit: "currency" | "ratio" | "percent" | "number" | "per_share";
  category: MetricCategory;
  applicable_sectors: Sector[];
  higher_is_better: boolean;
  format_decimals: number;
  founder_insight?: string;
}

export interface ParsedMetric {
  metric_name: string;
  value: number;
  unit: string;
  period_type: "annual" | "quarterly";
  fiscal_year: number;
  fiscal_quarter: number | null;
  period_start_date: string | null;
  period_end_date: string | null;
  accession_number: string;
  filed_at: string;
  form: string;
}
