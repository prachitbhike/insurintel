import { type Sector } from "./database";

export interface CompanyListItem {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  sub_sector: string | null;
  combined_ratio: number | null;
  roe: number | null;
  net_premiums_earned: number | null;
  premium_growth_yoy: number | null;
  eps: number | null;
  sparkline_data: number[];
}

export interface CompanyDetail {
  id: string;
  cik: string;
  ticker: string;
  name: string;
  sector: Sector;
  sub_sector: string | null;
  entity_name: string | null;
  kpis: KpiValue[];
  timeseries: Record<string, TimeseriesPoint[]>;
  peer_comparison: PeerComparison[];
  financials: FinancialRow[];
}

export interface KpiValue {
  metric_name: string;
  current_value: number | null;
  prior_value: number | null;
  change_pct: number | null;
  unit: string;
  fiscal_year: number;
}

export interface TimeseriesPoint {
  fiscal_year: number;
  fiscal_quarter: number | null;
  value: number;
}

export interface PeerComparison {
  metric_name: string;
  company_value: number | null;
  sector_avg: number | null;
  rank: number | null;
  total: number | null;
}

export interface FinancialRow {
  metric_name: string;
  values: Record<string, number | null>;
  unit: string;
}
