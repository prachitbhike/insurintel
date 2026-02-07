import { type SupabaseClient } from "@supabase/supabase-js";
import {
  type SectorAverage,
  type CompanyRanking,
} from "@/types/database";

export async function getSectorAverages(
  supabase: SupabaseClient,
  sector?: string
): Promise<SectorAverage[]> {
  let query = supabase.from("mv_sector_averages").select("*");
  if (sector) {
    query = query.eq("sector", sector);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSectorRankings(
  supabase: SupabaseClient,
  sector: string,
  metricName: string
): Promise<CompanyRanking[]> {
  const { data, error } = await supabase
    .from("mv_company_rankings")
    .select("*")
    .eq("sector", sector)
    .eq("metric_name", metricName)
    .order("rank_in_sector", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCompanyRankings(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyRanking[]> {
  const { data, error } = await supabase
    .from("mv_company_rankings")
    .select("*")
    .eq("company_id", companyId);

  if (error) throw error;
  return data ?? [];
}

export interface SectorOverview {
  sector: string;
  averages: Record<string, number>;
  companyCount: number;
}

export async function getSectorOverviews(
  supabase: SupabaseClient
): Promise<SectorOverview[]> {
  const { data, error } = await supabase
    .from("mv_sector_averages")
    .select("*");

  if (error) throw error;

  const sectorMap = new Map<string, SectorOverview>();
  for (const row of data ?? []) {
    if (!sectorMap.has(row.sector)) {
      sectorMap.set(row.sector, {
        sector: row.sector,
        averages: {},
        companyCount: row.company_count,
      });
    }
    const entry = sectorMap.get(row.sector)!;
    entry.averages[row.metric_name] = row.avg_value;
    // Use MAX company_count across all metrics for this sector
    if (row.company_count > entry.companyCount) {
      entry.companyCount = row.company_count;
    }
  }

  return Array.from(sectorMap.values());
}
