export interface Company {
  id: string;
  cik: string;
  ticker: string;
  name: string;
  sector: Sector;
  sub_sector: string | null;
  market_cap_bucket: string | null;
  sic_code: string | null;
  entity_name: string | null;
  is_active: boolean;
  last_ingested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialMetric {
  id: string;
  company_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  period_type: "annual" | "quarterly";
  fiscal_year: number;
  fiscal_quarter: number | null;
  period_start_date: string | null;
  period_end_date: string | null;
  is_derived: boolean;
  source: string;
  accession_number: string | null;
  filed_at: string | null;
  created_at: string;
}

export type Sector =
  | "P&C"
  | "Life"
  | "Health"
  | "Reinsurance"
  | "Brokers"
  | "Title"
  | "Mortgage Insurance";

export interface LatestMetric {
  company_id: string;
  ticker: string;
  name: string;
  sector: Sector;
  metric_name: string;
  metric_value: number;
  unit: string;
  fiscal_year: number;
  period_type: string;
}

export interface SectorAverage {
  sector: Sector;
  metric_name: string;
  avg_value: number;
  median_value: number;
  min_value: number;
  max_value: number;
  company_count: number;
  fiscal_year: number;
}

export interface CompanyRanking {
  company_id: string;
  ticker: string;
  name: string;
  sector: Sector;
  metric_name: string;
  metric_value: number;
  rank_in_sector: number;
  total_in_sector: number;
  fiscal_year: number;
}

export interface MetricTimeseries {
  company_id: string;
  ticker: string;
  metric_name: string;
  metric_value: number;
  fiscal_year: number;
  fiscal_quarter: number | null;
  period_type: string;
}

export interface IndustryTimeseriesRow {
  company_id: string;
  ticker: string;
  sector: Sector;
  metric_name: string;
  metric_value: number;
  fiscal_year: number;
  fiscal_quarter: number | null;
}
