import { type KeywordSnippet } from "@/types/tech-signals";

interface AnalysisResult {
  totalWordCount: number;
  aiMentionCount: number;
  mlMentionCount: number;
  automationMentionCount: number;
  digitalTransformationMentionCount: number;
  insurtechMentionCount: number;
  totalTechMentions: number;
  techDensityScore: number;
  classification: "tech-forward" | "in-transition" | "tech-laggard";
  keywordSnippets: KeywordSnippet[];
}

const KEYWORD_CATEGORIES: Record<string, RegExp[]> = {
  ai: [
    /\bartificial\s+intelligence\b/gi,
    /\bA\.?I\.?\b(?!\s*(?:rating|group|risk))/g,
    /\bgenerative\s+AI\b/gi,
    /\bAI[\s-](?:powered|driven|enabled|based)\b/gi,
    /\bdeep\s+learning\b/gi,
    /\bneural\s+network/gi,
    /\bnatural\s+language\s+processing\b/gi,
    /\bNLP\b/g,
    /\bcomputer\s+vision\b/gi,
    /\blarge\s+language\s+model/gi,
  ],
  ml: [
    /\bmachine\s+learning\b/gi,
    /\bpredictive\s+(?:analytics|model)/gi,
    /\bdata\s+science\b/gi,
    /\badvanced\s+analytics\b/gi,
    /\balgorithm(?:ic|s)\b/gi,
  ],
  automation: [
    /\brobot(?:ic)?\s+process\s+automation\b/gi,
    /\bRPA\b/g,
    /\bstraight[\s-]through\s+processing\b/gi,
    /\bSTP\b/g,
    /\bworkflow\s+automation\b/gi,
    /\bintelligent\s+automation\b/gi,
    /\bautomated\s+(?:underwriting|claims|processing)\b/gi,
    /\bself[\s-]service\s+(?:portal|platform)/gi,
    /\bdigital\s+(?:claims|underwriting|servicing)\b/gi,
  ],
  digital_transformation: [
    /\bdigital\s+transformation\b/gi,
    /\bcloud[\s-](?:based|native|computing|migration)\b/gi,
    /\bAPI[\s-](?:first|driven|enabled)\b/gi,
    /\bmoderniz(?:e|ation|ing)\b/gi,
    /\blegacy\s+(?:system|platform|technology)/gi,
    /\bdigital[\s-]first\b/gi,
    /\bdata[\s-]driven\b/gi,
    /\btechnology\s+investment/gi,
    /\btechnology\s+modernization\b/gi,
  ],
  insurtech: [
    /\binsurtech\b/gi,
    /\bfintech\b/gi,
    /\btelematics\b/gi,
    /\bparametric\s+(?:insurance|coverage)\b/gi,
    /\bembedded\s+insurance\b/gi,
    /\busage[\s-]based\s+(?:insurance|pricing)\b/gi,
    /\bIoT\b/g,
    /\bInternet\s+of\s+Things\b/gi,
    /\bblockchain\b/gi,
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI",
  ml: "ML",
  automation: "Automation",
  digital_transformation: "Digital Transformation",
  insurtech: "Insurtech",
};

function extractSnippet(text: string, matchIndex: number, keyword: string): string {
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + keyword.length + 80);
  let snippet = text.substring(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

export function analyzeFilingText(text: string): AnalysisResult {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWordCount = words.length;

  const counts: Record<string, number> = {
    ai: 0,
    ml: 0,
    automation: 0,
    digital_transformation: 0,
    insurtech: 0,
  };

  const snippets: KeywordSnippet[] = [];
  const maxSnippetsPerCategory = 3;

  for (const [category, patterns] of Object.entries(KEYWORD_CATEGORIES)) {
    let categorySnippets = 0;
    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        counts[category]++;
        if (categorySnippets < maxSnippetsPerCategory) {
          snippets.push({
            category: CATEGORY_LABELS[category],
            keyword: match[0],
            context: extractSnippet(text, match.index, match[0]),
          });
          categorySnippets++;
        }
      }
    }
  }

  const totalTechMentions = Object.values(counts).reduce((s, c) => s + c, 0);
  // Density = mentions per 10,000 words
  const techDensityScore = totalWordCount > 0
    ? Math.round((totalTechMentions / totalWordCount) * 10000 * 100) / 100
    : 0;

  let classification: AnalysisResult["classification"];
  if (techDensityScore >= 5.0) {
    classification = "tech-forward";
  } else if (techDensityScore >= 2.0) {
    classification = "in-transition";
  } else {
    classification = "tech-laggard";
  }

  return {
    totalWordCount,
    aiMentionCount: counts.ai,
    mlMentionCount: counts.ml,
    automationMentionCount: counts.automation,
    digitalTransformationMentionCount: counts.digital_transformation,
    insurtechMentionCount: counts.insurtech,
    totalTechMentions,
    techDensityScore,
    classification,
    keywordSnippets: snippets,
  };
}
