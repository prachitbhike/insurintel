import { edgarRateLimiter } from "./rate-limiter";

const EDGAR_BASE_URL = "https://data.sec.gov";

function getUserAgent(): string {
  return process.env.EDGAR_USER_AGENT || "InsurIntel admin@insurintel.com";
}

interface FilingEntry {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
}

interface SubmissionsResponse {
  cik: string;
  entityType: string;
  name: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

/**
 * Fetch company submissions from EDGAR to find 10-K filings
 */
export async function getCompanySubmissions(cik: string): Promise<FilingEntry[]> {
  const paddedCik = cik.padStart(10, "0");
  const url = `${EDGAR_BASE_URL}/submissions/CIK${paddedCik}.json`;

  await edgarRateLimiter.acquire();

  const response = await fetch(url, {
    headers: {
      "User-Agent": getUserAgent(),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`EDGAR submissions API returned ${response.status} for CIK ${cik}`);
  }

  const data: SubmissionsResponse = await response.json();
  const { accessionNumber, filingDate, reportDate, form, primaryDocument } = data.filings.recent;

  const filings: FilingEntry[] = [];
  for (let i = 0; i < form.length; i++) {
    if (form[i] === "10-K" || form[i] === "10-K/A") {
      filings.push({
        accessionNumber: accessionNumber[i],
        filingDate: filingDate[i],
        reportDate: reportDate[i],
        form: form[i],
        primaryDocument: primaryDocument[i],
      });
    }
  }

  return filings;
}

/**
 * Fetch the full text content of a 10-K filing
 */
export async function getFiling10KText(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): Promise<string> {
  const paddedCik = cik.padStart(10, "0");
  const accessionPath = accessionNumber.replace(/-/g, "");
  const url = `${EDGAR_BASE_URL}/Archives/edgar/data/${paddedCik}/${accessionPath}/${primaryDocument}`;

  await edgarRateLimiter.acquire();

  const response = await fetch(url, {
    headers: {
      "User-Agent": getUserAgent(),
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch 10-K text: ${response.status}`);
  }

  const html = await response.text();

  // Strip HTML tags to get plain text
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
