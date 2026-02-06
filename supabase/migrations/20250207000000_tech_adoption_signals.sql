-- Tech Adoption Signals table for 10-K text mining
CREATE TABLE IF NOT EXISTS tech_adoption_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  filing_date DATE,
  accession_number TEXT,
  total_word_count INTEGER NOT NULL DEFAULT 0,
  ai_mention_count INTEGER NOT NULL DEFAULT 0,
  ml_mention_count INTEGER NOT NULL DEFAULT 0,
  automation_mention_count INTEGER NOT NULL DEFAULT 0,
  digital_transformation_mention_count INTEGER NOT NULL DEFAULT 0,
  insurtech_mention_count INTEGER NOT NULL DEFAULT 0,
  total_tech_mentions INTEGER NOT NULL DEFAULT 0,
  tech_density_score NUMERIC NOT NULL DEFAULT 0,
  classification TEXT NOT NULL CHECK (classification IN ('tech-forward','in-transition','tech-laggard')),
  yoy_density_change NUMERIC,
  keyword_snippets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, fiscal_year)
);

-- Enable RLS
ALTER TABLE tech_adoption_signals ENABLE ROW LEVEL SECURITY;

-- Public read-only policy (same pattern as other tables)
CREATE POLICY "Allow public read access" ON tech_adoption_signals
  FOR SELECT USING (true);

-- Index for common queries
CREATE INDEX idx_tech_signals_company ON tech_adoption_signals(company_id);
CREATE INDEX idx_tech_signals_classification ON tech_adoption_signals(classification);
