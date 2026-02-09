import { type Sector } from "@/types/database";
import {
  type ProspectScoreInput,
  type ProspectScoreResult,
  type BulkScoringData,
} from "./types";

const WEIGHTS = {
  painIntensity: 0.5,
  abilityToPay: 0.2,
  urgency: 0.3,
};

/** Pain metrics by sector — higher values indicate more pain */
const PAIN_METRICS: Record<Sector, { metric: string; invert: boolean }[]> = {
  "P&C": [
    { metric: "expense_ratio", invert: false },
    { metric: "combined_ratio", invert: false },
  ],
  Reinsurance: [
    { metric: "expense_ratio", invert: false },
    { metric: "combined_ratio", invert: false },
  ],
  Health: [
    { metric: "medical_loss_ratio", invert: true }, // lower admin margin = more pain
  ],
  Life: [{ metric: "roe", invert: true }], // lower ROE = more pain
  Brokers: [
    { metric: "debt_to_equity", invert: false },
    { metric: "roe", invert: true },
  ],
  Title: [{ metric: "roe", invert: true }], // ROE-focused like Life
  "Mortgage Insurance": [
    { metric: "combined_ratio", invert: false },
    { metric: "roe", invert: true },
  ],
};

function minMaxNormalize(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function computeSlope(points: { fiscal_year: number; value: number }[]): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const recent = sorted.slice(-3); // last 3 years
  if (recent.length < 2) return null;

  const n = recent.length;
  const sumX = recent.reduce((s, p) => s + p.fiscal_year, 0);
  const sumY = recent.reduce((s, p) => s + p.value, 0);
  const sumXY = recent.reduce((s, p) => s + p.fiscal_year * p.value, 0);
  const sumX2 = recent.reduce((s, p) => s + p.fiscal_year * p.fiscal_year, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function computeProspectScore(
  input: ProspectScoreInput
): ProspectScoreResult {
  const { companyId, ticker, name, sector, metrics, sectorAverages, sectorMins, sectorMaxes, timeseries } = input;

  const result: ProspectScoreResult = {
    companyId,
    ticker,
    name,
    sector,
    totalScore: null,
    painIntensity: null,
    abilityToPay: null,
    urgency: null,
    painMetricName: null,
    painMetricValue: null,
    painVsSectorAvg: null,
    trendDirection: null,
    revenueBase: null,
  };

  const painConfigs = PAIN_METRICS[sector] ?? [];
  const dimensions: { name: keyof typeof WEIGHTS; score: number }[] = [];

  // 1. Pain Intensity (50%)
  let bestPainScore = -1;
  for (const { metric, invert } of painConfigs) {
    const val = metrics[metric];
    const avg = sectorAverages[metric];
    const min = sectorMins[metric];
    const max = sectorMaxes[metric];
    if (val == null || avg == null || min == null || max == null) continue;

    let raw: number;
    if (invert) {
      // For inverted metrics (lower = more pain), flip the normalization
      raw = minMaxNormalize(val, max, min);
    } else {
      raw = minMaxNormalize(val, min, max);
    }

    if (raw > bestPainScore) {
      bestPainScore = raw;
      result.painMetricName = metric;
      result.painMetricValue = val;
      result.painVsSectorAvg = val - avg;
    }
  }
  if (bestPainScore >= 0) {
    result.painIntensity = Math.round(bestPainScore);
    dimensions.push({ name: "painIntensity", score: bestPainScore });
  }

  // 2. Ability to Pay (20%)
  const revenueMetrics = ["net_premiums_earned", "revenue"];
  let revenue: number | null = null;
  for (const m of revenueMetrics) {
    if (metrics[m] != null) {
      revenue = metrics[m]!;
      break;
    }
  }
  result.revenueBase = revenue;
  if (revenue != null) {
    // Normalize: $0 = 0, $100B+ = 100
    const payScore = Math.min(100, (revenue / 100_000_000_000) * 100);
    result.abilityToPay = Math.round(payScore);
    dimensions.push({ name: "abilityToPay", score: payScore });
  }

  // 3. Urgency (30%) — worsening trend in pain metric + ROE
  const trendMetrics: string[] = [];
  if (result.painMetricName) trendMetrics.push(result.painMetricName);
  trendMetrics.push("roe");

  let urgencyScore: number | null = null;
  let slopeCount = 0;
  let slopeSum = 0;
  for (const m of trendMetrics) {
    const ts = timeseries[m];
    if (!ts || ts.length < 2) continue;
    const slope = computeSlope(ts);
    if (slope == null) continue;

    const painConfig = painConfigs.find((p) => p.metric === m);
    const isInverted = painConfig?.invert ?? (m === "roe");

    // For pain: positive slope on non-inverted = worsening = more urgency
    // For ROE: negative slope = worsening = more urgency
    const adjustedSlope = isInverted ? -slope : slope;
    slopeSum += adjustedSlope;
    slopeCount++;
  }

  if (slopeCount > 0) {
    const avgSlope = slopeSum / slopeCount;
    // Normalize slope: map roughly -5..+5 pp/year to 0..100
    urgencyScore = Math.max(0, Math.min(100, 50 + avgSlope * 10));
    result.urgency = Math.round(urgencyScore);
    dimensions.push({ name: "urgency", score: urgencyScore });

    if (avgSlope > 0.5) result.trendDirection = "worsening";
    else if (avgSlope < -0.5) result.trendDirection = "improving";
    else result.trendDirection = "stable";
  }

  // Compute total: weighted average with proportional redistribution for missing
  if (dimensions.length < 2) {
    result.totalScore = null;
    return result;
  }

  let totalWeight = 0;
  let weightedSum = 0;
  for (const d of dimensions) {
    const w = WEIGHTS[d.name];
    weightedSum += w * d.score;
    totalWeight += w;
  }

  result.totalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
  return result;
}

export function computeProspectScoresBatch(
  data: BulkScoringData
): ProspectScoreResult[] {
  return data.companies.map((company) => {
    const companyMetrics = data.latestMetrics[company.id] ?? {};
    const sectorAvgs: Record<string, number | null> = {};
    const sectorMins: Record<string, number | null> = {};
    const sectorMaxes: Record<string, number | null> = {};

    const sectorData = data.sectorAverages[company.sector] ?? {};
    for (const [metric, stats] of Object.entries(sectorData)) {
      sectorAvgs[metric] = stats.avg;
      sectorMins[metric] = stats.min;
      sectorMaxes[metric] = stats.max;
    }

    const companyTs: Record<string, { fiscal_year: number; value: number }[]> =
      data.timeseries[company.id] ?? {};

    return computeProspectScore({
      companyId: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
      metrics: companyMetrics,
      sectorAverages: sectorAvgs,
      sectorMins,
      sectorMaxes,
      timeseries: companyTs,
    });
  });
}
