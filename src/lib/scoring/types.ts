import { type Sector } from "@/types/database";

export interface ProspectScoreInput {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  metrics: Record<string, number | null>;
  sectorAverages: Record<string, number | null>;
  sectorMins: Record<string, number | null>;
  sectorMaxes: Record<string, number | null>;
  timeseries: Record<string, { fiscal_year: number; value: number }[]>;
}

export interface ProspectScoreResult {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  totalScore: number | null;
  painIntensity: number | null;
  abilityToPay: number | null;
  urgency: number | null;
  painMetricName: string | null;
  painMetricValue: number | null;
  painVsSectorAvg: number | null;
  trendDirection: "improving" | "worsening" | "stable" | null;
  revenueBase: number | null;
}

export interface BulkScoringData {
  companies: {
    id: string;
    ticker: string;
    name: string;
    sector: Sector;
  }[];
  latestMetrics: Record<string, Record<string, number>>;
  sectorAverages: Record<string, Record<string, { avg: number; min: number; max: number }>>;
  timeseries: Record<string, Record<string, { fiscal_year: number; value: number }[]>>;
}
