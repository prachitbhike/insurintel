import { type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { type Company } from "@/types/database";

export const getAllCompanies = cache(async (
  supabase: SupabaseClient
): Promise<Company[]> => {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_active", true)
    .order("ticker");

  if (error) throw error;
  return data ?? [];
});

export const getCompanyByTicker = cache(async (
  supabase: SupabaseClient,
  ticker: string
): Promise<Company | null> => {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("ticker", ticker.toUpperCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
});

export async function searchCompanies(
  supabase: SupabaseClient,
  query: string
): Promise<Company[]> {
  const searchTerm = `%${query}%`;
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_active", true)
    .or(`ticker.ilike.${searchTerm},name.ilike.${searchTerm}`)
    .order("ticker")
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function getCompaniesBySector(
  supabase: SupabaseClient,
  sector: string
): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("sector", sector)
    .eq("is_active", true)
    .order("ticker");

  if (error) throw error;
  return data ?? [];
}

export async function getCompaniesNeedingRefresh(
  supabase: SupabaseClient,
  limit: number = 8
): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_active", true)
    .order("last_ingested_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
