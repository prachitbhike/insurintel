import { type SupabaseClient } from "@supabase/supabase-js";
import { type TechAdoptionSignal } from "@/types/tech-signals";

export async function getTechSignalsByCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<TechAdoptionSignal[]> {
  const { data } = await supabase
    .from("tech_adoption_signals")
    .select("*")
    .eq("company_id", companyId)
    .order("fiscal_year", { ascending: false })
    .returns<TechAdoptionSignal[]>();

  return data ?? [];
}

export async function getLatestTechSignal(
  supabase: SupabaseClient,
  companyId: string
): Promise<TechAdoptionSignal | null> {
  const { data } = await supabase
    .from("tech_adoption_signals")
    .select("*")
    .eq("company_id", companyId)
    .order("fiscal_year", { ascending: false })
    .limit(1)
    .returns<TechAdoptionSignal[]>();

  return data?.[0] ?? null;
}

export async function getAllLatestTechSignals(
  supabase: SupabaseClient
): Promise<(TechAdoptionSignal & { ticker: string })[]> {
  // Get the latest signal per company by using a subquery approach
  const { data } = await supabase
    .from("tech_adoption_signals")
    .select("*, companies!inner(ticker)")
    .order("fiscal_year", { ascending: false });

  if (!data) return [];

  // Deduplicate to latest per company
  const seen = new Set<string>();
  const results: (TechAdoptionSignal & { ticker: string })[] = [];
  for (const row of data) {
    if (!seen.has(row.company_id)) {
      seen.add(row.company_id);
      results.push({
        ...row,
        ticker: (row.companies as { ticker: string }).ticker,
      });
    }
  }

  return results;
}
