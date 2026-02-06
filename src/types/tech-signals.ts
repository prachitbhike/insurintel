export interface TechAdoptionSignal {
  id: string;
  company_id: string;
  fiscal_year: number;
  filing_date: string | null;
  accession_number: string | null;
  total_word_count: number;
  ai_mention_count: number;
  ml_mention_count: number;
  automation_mention_count: number;
  digital_transformation_mention_count: number;
  insurtech_mention_count: number;
  total_tech_mentions: number;
  tech_density_score: number;
  classification: "tech-forward" | "in-transition" | "tech-laggard";
  yoy_density_change: number | null;
  keyword_snippets: KeywordSnippet[];
  created_at: string;
}

export interface KeywordSnippet {
  category: string;
  keyword: string;
  context: string;
}

export interface TechClassification {
  classification: "tech-forward" | "in-transition" | "tech-laggard";
  label: string;
  color: string;
  description: string;
}

export const TECH_CLASSIFICATIONS: Record<string, TechClassification> = {
  "tech-forward": {
    classification: "tech-forward",
    label: "Tech-Forward",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    description: "High density of AI/ML/automation references in filings",
  },
  "in-transition": {
    classification: "in-transition",
    label: "In Transition",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    description: "Moderate technology adoption signals",
  },
  "tech-laggard": {
    classification: "tech-laggard",
    label: "Tech Laggard",
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    description: "Minimal AI/technology mentions in filings",
  },
};
