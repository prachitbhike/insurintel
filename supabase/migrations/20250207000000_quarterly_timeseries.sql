-- Switch mv_metric_timeseries to quarterly data only.
-- Time-series charts now display quarterly data (Q1-Q3 from 10-Qs).
-- Scoring and other annual-only consumers read from the financial_metrics
-- base table directly with period_type = 'annual'.

DROP MATERIALIZED VIEW IF EXISTS mv_metric_timeseries;

CREATE MATERIALIZED VIEW mv_metric_timeseries AS
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
WHERE fm.period_type = 'quarterly'
  AND fm.fiscal_year >= EXTRACT(YEAR FROM now())::INTEGER - 5;

CREATE INDEX idx_mv_ts_company ON mv_metric_timeseries(company_id, metric_name, fiscal_year, fiscal_quarter);
