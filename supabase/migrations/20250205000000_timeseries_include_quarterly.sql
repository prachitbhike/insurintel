-- Include quarterly data in mv_metric_timeseries
-- Previously filtered to period_type = 'annual' only.
-- Existing queries that need annual-only already filter at the app layer
-- (getIndustryTimeseries, getBulkScoringData).

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
WHERE fm.fiscal_year >= EXTRACT(YEAR FROM now())::INTEGER - 5;

CREATE INDEX idx_mv_ts_company ON mv_metric_timeseries(company_id, metric_name, fiscal_year);
CREATE INDEX idx_mv_ts_period ON mv_metric_timeseries(period_type, metric_name);
