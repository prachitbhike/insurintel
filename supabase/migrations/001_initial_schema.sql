-- InsurIntel Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cik TEXT NOT NULL UNIQUE,
  ticker TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('P&C', 'Life', 'Health', 'Reinsurance', 'Brokers')),
  sub_sector TEXT,
  market_cap_bucket TEXT,
  sic_code TEXT,
  entity_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_sector ON companies(sector);
CREATE INDEX idx_companies_ticker ON companies(ticker);

-- Financial Metrics table (EAV pattern)
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'USD',
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER CHECK (fiscal_quarter IN (1, 2, 3, 4)),
  period_start_date DATE,
  period_end_date DATE,
  is_derived BOOLEAN DEFAULT false,
  source TEXT NOT NULL DEFAULT 'edgar',
  accession_number TEXT,
  filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, metric_name, period_type, fiscal_year, fiscal_quarter)
);

CREATE INDEX idx_fm_company_metric ON financial_metrics(company_id, metric_name);
CREATE INDEX idx_fm_metric_year ON financial_metrics(metric_name, fiscal_year, fiscal_quarter);
CREATE INDEX idx_fm_company_year ON financial_metrics(company_id, fiscal_year, fiscal_quarter);

-- Materialized View: Latest annual metrics per company
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_metrics AS
WITH ranked AS (
  SELECT
    fm.company_id,
    c.ticker,
    c.name,
    c.sector,
    fm.metric_name,
    fm.metric_value,
    fm.unit,
    fm.fiscal_year,
    fm.period_type,
    ROW_NUMBER() OVER (
      PARTITION BY fm.company_id, fm.metric_name
      ORDER BY fm.fiscal_year DESC, fm.fiscal_quarter DESC NULLS LAST
    ) AS rn
  FROM financial_metrics fm
  JOIN companies c ON c.id = fm.company_id
  WHERE fm.period_type = 'annual'
)
SELECT company_id, ticker, name, sector, metric_name, metric_value, unit, fiscal_year, period_type
FROM ranked
WHERE rn = 1;

CREATE UNIQUE INDEX idx_mv_latest_pk ON mv_latest_metrics(company_id, metric_name);

-- Materialized View: Sector averages
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sector_averages AS
WITH latest AS (
  SELECT * FROM mv_latest_metrics
)
SELECT
  sector,
  metric_name,
  AVG(metric_value) AS avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) AS median_value,
  MIN(metric_value) AS min_value,
  MAX(metric_value) AS max_value,
  COUNT(*)::INTEGER AS company_count,
  MAX(fiscal_year) AS fiscal_year
FROM latest
GROUP BY sector, metric_name;

CREATE UNIQUE INDEX idx_mv_sector_avg_pk ON mv_sector_averages(sector, metric_name);

-- Materialized View: Company rankings within sector
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_company_rankings AS
WITH latest AS (
  SELECT * FROM mv_latest_metrics
)
SELECT
  company_id,
  ticker,
  name,
  sector,
  metric_name,
  metric_value,
  RANK() OVER (
    PARTITION BY sector, metric_name
    ORDER BY metric_value DESC
  )::INTEGER AS rank_in_sector,
  COUNT(*) OVER (
    PARTITION BY sector, metric_name
  )::INTEGER AS total_in_sector,
  fiscal_year
FROM latest;

CREATE UNIQUE INDEX idx_mv_rankings_pk ON mv_company_rankings(company_id, metric_name);

-- Materialized View: Metric timeseries (last 5 years annual data)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_metric_timeseries AS
SELECT
  fm.company_id,
  c.ticker,
  fm.metric_name,
  fm.metric_value,
  fm.fiscal_year,
  fm.fiscal_quarter,
  fm.period_type
FROM financial_metrics fm
JOIN companies c ON c.id = fm.company_id
WHERE fm.period_type = 'annual'
  AND fm.fiscal_year >= EXTRACT(YEAR FROM now())::INTEGER - 5;

CREATE INDEX idx_mv_ts_company ON mv_metric_timeseries(company_id, metric_name, fiscal_year);

-- Row Level Security (Public read-only)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Public read financial_metrics" ON financial_metrics FOR SELECT USING (true);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_metrics;
  REFRESH MATERIALIZED VIEW mv_sector_averages;
  REFRESH MATERIALIZED VIEW mv_company_rankings;
  REFRESH MATERIALIZED VIEW mv_metric_timeseries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
