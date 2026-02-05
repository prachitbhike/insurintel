import { type CompanyFacts } from "./types";
import { edgarRateLimiter } from "./rate-limiter";

const EDGAR_BASE_URL = "https://data.sec.gov";
const MAX_RETRIES = 3;

function getUserAgent(): string {
  return process.env.EDGAR_USER_AGENT || "InsurIntel admin@insurintel.com";
}

async function fetchWithRetry(
  url: string,
  retries: number = MAX_RETRIES
): Promise<Response> {
  await edgarRateLimiter.acquire();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": getUserAgent(),
          Accept: "application/json",
        },
      });

      if (response.ok) return response;

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(
            `EDGAR ${response.status} on ${url}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          await edgarRateLimiter.acquire();
          continue;
        }
      }

      throw new Error(`EDGAR API error: ${response.status} ${response.statusText} for ${url}`);
    } catch (error) {
      if (attempt < retries && error instanceof TypeError) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Network error fetching ${url}, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export async function getCompanyFacts(
  cik: string
): Promise<CompanyFacts> {
  const paddedCik = cik.replace(/^0+/, "").padStart(10, "0");
  const url = `${EDGAR_BASE_URL}/api/xbrl/companyfacts/CIK${paddedCik}.json`;

  const response = await fetchWithRetry(url);
  return response.json();
}

export async function getCompanyTickers(): Promise<
  Record<string, { cik_str: number; ticker: string; title: string }>
> {
  const url = `${EDGAR_BASE_URL}/files/company_tickers.json`;
  const response = await fetchWithRetry(url);
  return response.json();
}
