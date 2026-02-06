import { type SupabaseClient } from "@supabase/supabase-js";
import { type Sector } from "@/types/database";

export interface FilingRecord {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  periodType: string;
  fiscalYear: number;
  filedAt: string | null;
  periodEndDate: string | null;
}

export interface FilingCalendarEntry {
  date: string;
  filings: FilingRecord[];
}

export async function getFilingRecords(
  supabase: SupabaseClient
): Promise<FilingRecord[]> {
  // Get distinct filing dates per company per fiscal year
  const { data } = await supabase
    .from("financial_metrics")
    .select(`
      company_id,
      period_type,
      fiscal_year,
      filed_at,
      period_end_date,
      companies!inner(ticker, name, sector)
    `)
    .eq("period_type", "annual")
    .not("filed_at", "is", null)
    .order("filed_at", { ascending: false });

  if (!data) return [];

  // Deduplicate by company + fiscal_year (take latest filed_at)
  const seen = new Map<string, FilingRecord>();
  for (const row of data) {
    const key = `${row.company_id}-${row.fiscal_year}`;
    if (!seen.has(key)) {
      const company = row.companies as unknown as { ticker: string; name: string; sector: Sector };
      seen.set(key, {
        companyId: row.company_id,
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        periodType: row.period_type,
        fiscalYear: row.fiscal_year,
        filedAt: row.filed_at,
        periodEndDate: row.period_end_date,
      });
    }
  }

  return [...seen.values()].sort((a, b) => {
    // Sort by filed_at descending
    if (a.filedAt && b.filedAt) return b.filedAt.localeCompare(a.filedAt);
    return 0;
  });
}

export function groupFilingsByMonth(
  filings: FilingRecord[]
): Map<string, FilingRecord[]> {
  const grouped = new Map<string, FilingRecord[]>();

  for (const f of filings) {
    if (!f.filedAt) continue;
    const month = f.filedAt.substring(0, 7); // YYYY-MM
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(f);
  }

  return grouped;
}

export function estimateNextFiling(lastFiledAt: string): string {
  const date = new Date(lastFiledAt);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}
