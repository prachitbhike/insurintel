-- Fix unique constraint to handle NULL fiscal_quarter properly.
-- Postgres treats NULL != NULL in standard UNIQUE constraints, so annual
-- metrics (fiscal_quarter IS NULL) were creating duplicates instead of
-- being upserted. NULLS NOT DISTINCT (Postgres 15+) treats NULLs as equal.

-- First, remove duplicate rows keeping only the most recently filed entry
DELETE FROM financial_metrics a
USING financial_metrics b
WHERE a.company_id = b.company_id
  AND a.metric_name = b.metric_name
  AND a.period_type = b.period_type
  AND a.fiscal_year = b.fiscal_year
  AND a.fiscal_quarter IS NOT DISTINCT FROM b.fiscal_quarter
  AND a.id < b.id;

-- Drop the old constraint
ALTER TABLE financial_metrics
  DROP CONSTRAINT IF EXISTS financial_metrics_company_id_metric_name_period_type_fiscal_ye_key;

-- Add the new constraint with NULLS NOT DISTINCT
ALTER TABLE financial_metrics
  ADD CONSTRAINT financial_metrics_unique_key
  UNIQUE NULLS NOT DISTINCT (company_id, metric_name, period_type, fiscal_year, fiscal_quarter);
