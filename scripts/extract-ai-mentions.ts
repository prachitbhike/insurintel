#!/usr/bin/env npx tsx
/**
 * Extract AI-related mentions from the 3 most recent 10-K filings
 * for each of the 41 insurance companies tracked by InsurIntel.
 *
 * Usage: npx tsx scripts/extract-ai-mentions.ts
 */

import { writeFileSync } from "fs";

// Inline company data to avoid path alias issues in standalone script
const COMPANIES = [
  { cik: "0000896159", ticker: "CB", name: "Chubb Limited", sector: "P&C" },
  { cik: "0000080661", ticker: "PGR", name: "Progressive Corporation", sector: "P&C" },
  { cik: "0000086312", ticker: "TRV", name: "Travelers Companies", sector: "P&C" },
  { cik: "0000899051", ticker: "ALL", name: "Allstate Corporation", sector: "P&C" },
  { cik: "0000005272", ticker: "AIG", name: "American International Group", sector: "P&C" },
  { cik: "0000874766", ticker: "HIG", name: "Hartford Financial Services", sector: "P&C" },
  { cik: "0000947484", ticker: "ACGL", name: "Arch Capital Group", sector: "P&C" },
  { cik: "0000011544", ticker: "WRB", name: "W.R. Berkley Corporation", sector: "P&C" },
  { cik: "0000020286", ticker: "CINF", name: "Cincinnati Financial", sector: "P&C" },
  { cik: "0001096343", ticker: "MKL", name: "Markel Group", sector: "P&C" },
  { cik: "0000021175", ticker: "CNA", name: "CNA Financial", sector: "P&C" },
  { cik: "0000922621", ticker: "ERIE", name: "Erie Indemnity", sector: "P&C" },
  { cik: "0001042046", ticker: "AFG", name: "American Financial Group", sector: "P&C" },
  { cik: "0000074260", ticker: "ORI", name: "Old Republic International", sector: "P&C" },
  { cik: "0001267238", ticker: "AIZ", name: "Assurant", sector: "P&C" },
  { cik: "0001099219", ticker: "MET", name: "MetLife", sector: "Life" },
  { cik: "0001137774", ticker: "PRU", name: "Prudential Financial", sector: "Life" },
  { cik: "0000004977", ticker: "AFL", name: "Aflac", sector: "Life" },
  { cik: "0001889539", ticker: "CRBG", name: "Corebridge Financial", sector: "Life" },
  { cik: "0001126328", ticker: "PFG", name: "Principal Financial Group", sector: "Life" },
  { cik: "0001333986", ticker: "EQH", name: "Equitable Holdings", sector: "Life" },
  { cik: "0000005513", ticker: "UNM", name: "Unum Group", sector: "Life" },
  { cik: "0000320335", ticker: "GL", name: "Globe Life", sector: "Life" },
  { cik: "0000059558", ticker: "LNC", name: "Lincoln National", sector: "Life" },
  { cik: "0000731766", ticker: "UNH", name: "UnitedHealth Group", sector: "Health" },
  { cik: "0001739940", ticker: "CI", name: "Cigna Group", sector: "Health" },
  { cik: "0001156039", ticker: "ELV", name: "Elevance Health", sector: "Health" },
  { cik: "0000049071", ticker: "HUM", name: "Humana", sector: "Health" },
  { cik: "0001071739", ticker: "CNC", name: "Centene Corporation", sector: "Health" },
  { cik: "0001179929", ticker: "MOH", name: "Molina Healthcare", sector: "Health" },
  { cik: "0000064803", ticker: "CVS", name: "CVS Health", sector: "Health" },
  { cik: "0001067983", ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Reinsurance" },
  { cik: "0000913144", ticker: "RNR", name: "RenaissanceRe Holdings", sector: "Reinsurance" },
  { cik: "0001095073", ticker: "EG", name: "Everest Group", sector: "Reinsurance" },
  { cik: "0000898174", ticker: "RGA", name: "Reinsurance Group of America", sector: "Reinsurance" },
  { cik: "0000062709", ticker: "MMC", name: "Marsh & McLennan", sector: "Brokers" },
  { cik: "0000315293", ticker: "AON", name: "Aon plc", sector: "Brokers" },
  { cik: "0000354190", ticker: "AJG", name: "Arthur J. Gallagher", sector: "Brokers" },
  { cik: "0001140536", ticker: "WTW", name: "Willis Towers Watson", sector: "Brokers" },
  { cik: "0000079282", ticker: "BRO", name: "Brown & Brown", sector: "Brokers" },
  { cik: "0001849253", ticker: "RYAN", name: "Ryan Specialty Holdings", sector: "Brokers" },
];

const EDGAR_BASE = "https://data.sec.gov";
const USER_AGENT =
  process.env.EDGAR_USER_AGENT || "InsurIntel admin@insurintel.com";
const FILINGS_TO_CHECK = 3;
const MAX_DOC_SIZE = 15 * 1024 * 1024; // 15 MB limit

// --- Rate limiter (8 req/sec) ---
let tokens = 8;
let lastRefill = Date.now();
async function acquireToken(): Promise<void> {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(8, tokens + elapsed * 8);
  lastRefill = now;
  if (tokens >= 1) {
    tokens -= 1;
    return;
  }
  const waitMs = ((1 - tokens) / 8) * 1000;
  await new Promise((r) => setTimeout(r, waitMs));
  const now2 = Date.now();
  tokens = Math.min(8, tokens + ((now2 - lastRefill) / 1000) * 8);
  lastRefill = now2;
  tokens -= 1;
}

async function fetchEdgar(url: string, retries = 2): Promise<Response> {
  await acquireToken();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html, application/json, */*",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`  HTTP ${res.status}, retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        await acquireToken();
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (err: any) {
      if (attempt < retries && (err.name === "TimeoutError" || err instanceof TypeError)) {
        const delay = Math.pow(2, attempt) * 2000;
        console.warn(`  Network error, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

// --- HTML snippet cleaner ---
function cleanSnippet(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- AI search patterns ---
interface SearchPattern {
  term: string;
  regex: RegExp;
  highSignal: boolean;
}

const PATTERNS: SearchPattern[] = [
  { term: "artificial intelligence", regex: /artificial\s+intelligence/gi, highSignal: true },
  { term: "machine learning", regex: /machine\s+learning/gi, highSignal: true },
  { term: "deep learning", regex: /deep\s+learning/gi, highSignal: true },
  { term: "generative AI", regex: /generative\s+a\.?i\.?/gi, highSignal: true },
  { term: "GenAI", regex: /\bgen\s*ai\b/gi, highSignal: true },
  { term: "large language model", regex: /large\s+language\s+model/gi, highSignal: true },
  { term: "LLM", regex: /\bLLMs?\b/g, highSignal: true },
  { term: "natural language processing", regex: /natural\s+language\s+processing/gi, highSignal: true },
  { term: "neural network", regex: /neural\s+network/gi, highSignal: true },
  { term: "computer vision", regex: /computer\s+vision/gi, highSignal: true },
  { term: "robotic process automation", regex: /robotic\s+process\s+automation/gi, highSignal: true },
  { term: "ChatGPT", regex: /chat\s*gpt/gi, highSignal: true },
  { term: "OpenAI", regex: /\bopenai\b/gi, highSignal: true },
  { term: "AI-powered", regex: /\bai[\s-]powered\b/gi, highSignal: true },
  { term: "AI-driven", regex: /\bai[\s-]driven\b/gi, highSignal: true },
  { term: "AI-enabled", regex: /\bai[\s-]enabled\b/gi, highSignal: true },
  { term: "AI-based", regex: /\bai[\s-]based\b/gi, highSignal: true },
  { term: "predictive analytics", regex: /predictive\s+analytics/gi, highSignal: false },
  { term: "predictive model", regex: /predictive\s+model(?:ing|s)?/gi, highSignal: false },
  { term: "data analytics", regex: /data\s+analytics/gi, highSignal: false },
  { term: "advanced analytics", regex: /advanced\s+analytics/gi, highSignal: false },
  { term: "telematics", regex: /\btelematics\b/gi, highSignal: false },
  { term: "insurtech", regex: /\binsur\s*tech\b/gi, highSignal: false },
  { term: "digital transformation", regex: /digital\s+transformation/gi, highSignal: false },
  { term: "automation", regex: /\bautomation\b/gi, highSignal: false },
];

interface Mention {
  term: string;
  context: string;
  highSignal: boolean;
}

interface FilingResult {
  filingDate: string;
  reportDate: string;
  accession: string;
  url: string;
  mentions: Mention[];
}

interface CompanyResult {
  ticker: string;
  name: string;
  sector: string;
  filings: FilingResult[];
}

// --- Get recent 10-K filing metadata ---
async function getRecent10Ks(
  cik: string
): Promise<{ accession: string; filingDate: string; reportDate: string; primaryDoc: string }[]> {
  const padded = cik.replace(/^0+/, "").padStart(10, "0");
  const url = `${EDGAR_BASE}/submissions/CIK${padded}.json`;
  const res = await fetchEdgar(url);
  const data = (await res.json()) as any;
  const recent = data.filings?.recent;
  if (!recent) return [];

  const filings: { accession: string; filingDate: string; reportDate: string; primaryDoc: string }[] = [];
  for (let i = 0; i < recent.form.length && filings.length < FILINGS_TO_CHECK; i++) {
    const form = recent.form[i] as string;
    if (form === "10-K" || form === "10-K/A") {
      filings.push({
        accession: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate?.[i] || recent.filingDate[i],
        primaryDoc: recent.primaryDocument[i],
      });
    }
  }
  return filings;
}

// --- Extract AI mentions from HTML ---
function extractMentions(html: string): Mention[] {
  const mentions: Mention[] = [];
  const seenSnippets = new Set<string>();

  for (const pat of PATTERNS) {
    pat.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = pat.regex.exec(html)) !== null && count < 8) {
      // Extract surrounding HTML context
      const start = Math.max(0, match.index - 400);
      const end = Math.min(html.length, match.index + match[0].length + 400);
      const rawSnippet = html.slice(start, end);

      // Clean to text
      const text = cleanSnippet(rawSnippet);
      if (text.length < 30) continue; // skip trivial matches

      // Deduplicate by first 80 chars
      const key = text.slice(0, 80).toLowerCase();
      if (seenSnippets.has(key)) continue;
      seenSnippets.add(key);

      // Skip matches that are clearly in navigation/headers/tables-of-contents
      const lower = text.toLowerCase();
      if (lower.includes("table of contents") && text.length < 100) continue;

      mentions.push({ term: pat.term, context: text, highSignal: pat.highSignal });
      count++;
    }
  }

  // High-signal first, then by position (implicitly by order found)
  mentions.sort((a, b) => (b.highSignal ? 1 : 0) - (a.highSignal ? 1 : 0));
  return mentions;
}

// --- Process one company ---
async function processCompany(
  company: (typeof COMPANIES)[0]
): Promise<CompanyResult> {
  const filingsMeta = await getRecent10Ks(company.cik);
  console.log(`  Found ${filingsMeta.length} 10-K filings`);

  const filingResults: FilingResult[] = [];

  for (const fm of filingsMeta) {
    const cikNum = company.cik.replace(/^0+/, "");
    const accNoDash = fm.accession.replace(/-/g, "");
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/${fm.primaryDoc}`;

    try {
      console.log(`  Fetching FY${fm.reportDate.slice(0, 4)} (filed ${fm.filingDate})...`);
      const res = await fetchEdgar(docUrl);

      // Check content length
      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_DOC_SIZE) {
        console.warn(`    Skipping: document too large (${(parseInt(contentLength) / 1024 / 1024).toFixed(1)} MB)`);
        filingResults.push({
          filingDate: fm.filingDate,
          reportDate: fm.reportDate,
          accession: fm.accession,
          url: docUrl,
          mentions: [],
        });
        continue;
      }

      const html = await res.text();
      const mentions = extractMentions(html);

      const highCount = mentions.filter((m) => m.highSignal).length;
      console.log(`    ${mentions.length} mentions (${highCount} high-signal)`);

      filingResults.push({
        filingDate: fm.filingDate,
        reportDate: fm.reportDate,
        accession: fm.accession,
        url: docUrl,
        mentions,
      });
    } catch (err: any) {
      console.error(`    Error: ${err.message}`);
      filingResults.push({
        filingDate: fm.filingDate,
        reportDate: fm.reportDate,
        accession: fm.accession,
        url: docUrl,
        mentions: [],
      });
    }
  }

  return {
    ticker: company.ticker,
    name: company.name,
    sector: company.sector,
    filings: filingResults,
  };
}

// --- Generate markdown output ---
function generateMarkdown(results: CompanyResult[]): string {
  let md = "# AI Mentions in Insurance Company 10-K Filings\n\n";
  md += `*Extracted from the 3 most recent 10-K filings for each of 41 InsurIntel companies.*\n`;
  md += `*Generated: ${new Date().toISOString().split("T")[0]}*\n\n`;
  md += "---\n\n";

  const sectors = ["P&C", "Life", "Health", "Reinsurance", "Brokers"];

  for (const sector of sectors) {
    md += `## ${sector}\n\n`;
    const sectorCos = results.filter((r) => r.sector === sector);

    for (const co of sectorCos) {
      const totalMentions = co.filings.reduce((s, f) => s + f.mentions.length, 0);
      const highTotal = co.filings.reduce(
        (s, f) => s + f.mentions.filter((m) => m.highSignal).length,
        0
      );

      md += `### ${co.ticker} — ${co.name}\n\n`;
      md += `**Total mentions: ${totalMentions}** (${highTotal} high-signal)\n\n`;

      if (totalMentions === 0) {
        md += "*No significant AI-related mentions found.*\n\n---\n\n";
        continue;
      }

      for (const filing of co.filings) {
        if (filing.mentions.length === 0) continue;
        const fy = filing.reportDate.slice(0, 4);
        md += `**FY${fy} 10-K** (filed ${filing.filingDate}) — ${filing.mentions.length} mentions\n\n`;

        // Show up to 12 high-signal + 3 low-signal
        const high = filing.mentions.filter((m) => m.highSignal).slice(0, 12);
        const low = filing.mentions.filter((m) => !m.highSignal).slice(0, 3);
        const shown = [...high, ...low];

        for (const m of shown) {
          const badge = m.highSignal ? "[HIGH]" : "[low]";
          md += `- ${badge} **${m.term}**: "...${m.context}..."\n\n`;
        }

        const remaining = filing.mentions.length - shown.length;
        if (remaining > 0) {
          md += `*Plus ${remaining} additional mentions not shown.*\n\n`;
        }
      }
      md += "---\n\n";
    }
  }
  return md;
}

// --- Main ---
async function main() {
  console.log(`\n=== AI Mentions Extractor ===`);
  console.log(`Companies: ${COMPANIES.length}`);
  console.log(`Filings per company: ${FILINGS_TO_CHECK}`);
  console.log(`User-Agent: ${USER_AGENT}\n`);

  const results: CompanyResult[] = [];

  for (let i = 0; i < COMPANIES.length; i++) {
    const co = COMPANIES[i];
    console.log(`[${i + 1}/${COMPANIES.length}] ${co.ticker} (${co.name})`);

    try {
      const result = await processCompany(co);
      results.push(result);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ ticker: co.ticker, name: co.name, sector: co.sector, filings: [] });
    }
  }

  // Write outputs
  const md = generateMarkdown(results);
  writeFileSync("scripts/ai-mentions-raw.md", md);
  console.log(`\nMarkdown written to scripts/ai-mentions-raw.md`);

  writeFileSync("scripts/ai-mentions-raw.json", JSON.stringify(results, null, 2));
  console.log(`JSON written to scripts/ai-mentions-raw.json`);

  // Summary
  console.log("\n=== SUMMARY ===");
  const sectors = ["P&C", "Life", "Health", "Reinsurance", "Brokers"];
  for (const sector of sectors) {
    console.log(`\n${sector}:`);
    for (const co of results.filter((r) => r.sector === sector)) {
      const total = co.filings.reduce((s, f) => s + f.mentions.length, 0);
      const high = co.filings.reduce(
        (s, f) => s + f.mentions.filter((m) => m.highSignal).length,
        0
      );
      console.log(`  ${co.ticker.padEnd(6)} ${String(total).padStart(4)} mentions (${high} high-signal)`);
    }
  }
}

main().catch(console.error);
