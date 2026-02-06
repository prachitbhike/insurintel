import { type Sector } from "@/types/database";
import { type ProspectScoreResult } from "./types";
import { getUseCasesForSector } from "@/lib/data/use-cases";
import { formatCurrency, formatPercent } from "@/lib/metrics/formatters";
import { interpretMetric, type InterpretContext } from "@/lib/metrics/interpret";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

export interface FounderNarrative {
  hookSentence: string;
  sentences: string[];
  relevantUseCases: { id: string; name: string; reasoning: string }[];
  companyType: "large_cap" | "mid_cap" | "small_cap" | "broker";
}

interface NarrativeInput {
  companyName: string;
  ticker: string;
  sector: Sector;
  metrics: Record<string, number | null>;
  sectorAverages: Record<string, number | null>;
  prospectScore: ProspectScoreResult | null;
  sectorCompanies?: { ticker: string; metrics: Record<string, number | null> }[];
  timeseries?: Record<string, Record<number, number>>;
}

function classifyCompany(
  sector: Sector,
  revenue: number | null
): FounderNarrative["companyType"] {
  if (sector === "Brokers") return "broker";
  if (revenue == null) return "small_cap";
  if (revenue >= 50_000_000_000) return "large_cap";
  if (revenue >= 5_000_000_000) return "mid_cap";
  return "small_cap";
}

/** Find the best-in-class company for a given metric in the sector */
function findBestInClass(
  metricName: string,
  sectorCompanies: { ticker: string; metrics: Record<string, number | null> }[],
  lowerIsBetter: boolean,
): { ticker: string; value: number } | null {
  let best: { ticker: string; value: number } | null = null;
  for (const c of sectorCompanies) {
    const v = c.metrics[metricName];
    if (v == null) continue;
    if (best == null) {
      best = { ticker: c.ticker, value: v };
    } else if (lowerIsBetter ? v < best.value : v > best.value) {
      best = { ticker: c.ticker, value: v };
    }
  }
  return best;
}

/** Determine primary pain metric for a sector */
function getPainMetricName(sector: Sector): string {
  switch (sector) {
    case "P&C":
    case "Reinsurance":
      return "combined_ratio";
    case "Health":
      return "medical_loss_ratio";
    case "Life":
      return "roe";
    case "Brokers":
      return "debt_to_equity";
    default:
      return "roe";
  }
}

function generateHookSentence(
  companyName: string,
  sector: Sector,
  metrics: Record<string, number | null>,
  sectorAverages: Record<string, number | null>,
): string {
  const painMetric = getPainMetricName(sector);
  const premiums = metrics["net_premiums_earned"] ?? metrics["revenue"] ?? null;
  const value = metrics[painMetric];
  const sectorAvg = sectorAverages[painMetric] ?? null;

  if (value == null) {
    if (premiums != null) {
      return `${companyName} has ${formatCurrency(premiums)} in annual premiums.`;
    }
    return `${companyName} is a ${sector} insurer.`;
  }

  const ctx: InterpretContext = {
    sector,
    sectorAvg,
    sectorMin: null,
    sectorMax: null,
    rank: null,
    totalInSector: null,
    premiumBase: premiums,
  };

  const interp = interpretMetric(painMetric, value, ctx);
  if (!interp) return `${companyName} is a ${sector} insurer.`;

  const parts = [interp.plainEnglish];
  if (interp.dollarImpact) {
    parts.push(interp.dollarImpact);
  }

  // Build the hook: "Company is [interpretation]"
  if (painMetric === "combined_ratio" && value > 100) {
    const gap = value - 100;
    let hook = `${companyName} is losing $${gap.toFixed(2)} per $100 of premiums — their combined ratio of ${formatPercent(value, 1)} `;
    if (premiums != null) {
      const losses = (gap / 100) * premiums;
      hook += `translates to ${formatCurrency(losses)} in annual underwriting losses`;
      if (premiums > 0) hook += ` on ${formatCurrency(premiums)} of premiums`;
    } else {
      hook += "indicates underwriting losses";
    }
    return hook + ".";
  }

  if (painMetric === "medical_loss_ratio") {
    const adminMargin = 100 - value;
    let hook = `${companyName} retains only ${formatPercent(adminMargin, 1)} of premiums for admin and profit (MLR: ${formatPercent(value, 1)})`;
    if (premiums != null) {
      const adminPool = (adminMargin / 100) * premiums;
      hook += ` — ${formatCurrency(adminPool)} admin margin pool`;
    }
    return hook + ".";
  }

  if (painMetric === "roe" && value < 5 && sector === "Life") {
    return `${companyName} is generating ${value < 0 ? "negative" : "only " + formatPercent(value, 1)} returns on equity — ${interp.plainEnglish.toLowerCase()}.`;
  }

  return `${companyName}: ${parts.join(". ")}.`;
}

export function generateFounderNarrative(input: NarrativeInput): FounderNarrative {
  const { companyName, sector, metrics, sectorAverages, prospectScore, sectorCompanies, timeseries } = input;
  const sentences: string[] = [];

  const revenue = metrics["revenue"] ?? metrics["net_premiums_earned"] ?? null;
  const companyType = classifyCompany(sector, revenue);
  const premiums = metrics["net_premiums_earned"] ?? metrics["revenue"];

  // Hook sentence
  const hookSentence = generateHookSentence(companyName, sector, metrics, sectorAverages);

  // 1. Peer comparison (name actual best-in-class if sectorCompanies provided)
  const expenseRatio = metrics["expense_ratio"];
  const sectorAvgExpenseRatio = sectorAverages["expense_ratio"];

  if (expenseRatio != null && sectorAvgExpenseRatio != null && premiums != null && expenseRatio > sectorAvgExpenseRatio) {
    const gap = expenseRatio - sectorAvgExpenseRatio;
    const addressable = (gap / 100) * premiums;

    if (sectorCompanies && sectorCompanies.length > 0) {
      const def = METRIC_DEFINITIONS["expense_ratio"];
      const bestPeer = findBestInClass("expense_ratio", sectorCompanies, def?.higher_is_better === false);
      if (bestPeer && bestPeer.ticker !== input.ticker) {
        const peerGap = expenseRatio - bestPeer.value;
        const peerSavings = (peerGap / 100) * premiums;
        sentences.push(
          `Their expense ratio of ${formatPercent(expenseRatio, 1)} is ${peerGap.toFixed(1)}pp above ${bestPeer.ticker} (${formatPercent(bestPeer.value, 1)}), the most efficient ${sector} insurer — this gap equals ${formatCurrency(peerSavings)} in excess operating costs.`
        );
      } else {
        sentences.push(
          `${companyName} has an expense ratio of ${formatPercent(expenseRatio, 1)}, which is ${formatPercent(gap, 1)} points above the ${sector} sector average. This gap represents ${formatCurrency(addressable)} in expenses relative to peers.`
        );
      }
    } else {
      sentences.push(
        `${companyName} has an expense ratio of ${formatPercent(expenseRatio, 1)}, which is ${formatPercent(gap, 1)} points above the ${sector} sector average. This gap represents ${formatCurrency(addressable)} in expenses relative to peers.`
      );
    }
  } else if (revenue != null) {
    sentences.push(
      `${companyName} has ${formatCurrency(revenue)} in revenue.`
    );
  }

  // 2. Trend with specific years (if timeseries provided)
  if (prospectScore?.trendDirection && prospectScore.painMetricName) {
    const metricLabel = prospectScore.painMetricName.replace(/_/g, " ");
    const ts = timeseries?.[prospectScore.painMetricName];

    if (ts && Object.keys(ts).length >= 2) {
      const years = Object.keys(ts).map(Number).sort((a, b) => a - b);
      const firstYear = years[0];
      const lastYear = years[years.length - 1];
      const firstVal = ts[firstYear];
      const lastVal = ts[lastYear];
      const def = METRIC_DEFINITIONS[prospectScore.painMetricName];
      const format = def?.unit === "percent" ? formatPercent : (v: number) => v.toFixed(1);

      if (prospectScore.trendDirection === "worsening") {
        sentences.push(
          `This has worsened from ${format(firstVal, 1)} in FY${firstYear} to ${format(lastVal, 1)} in FY${lastYear}.`
        );
      } else if (prospectScore.trendDirection === "improving") {
        sentences.push(
          `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)} has improved from ${format(firstVal, 1)} in FY${firstYear} to ${format(lastVal, 1)} in FY${lastYear}.`
        );
      } else {
        sentences.push(
          `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)} has been stable (${format(firstVal, 1)} in FY${firstYear} to ${format(lastVal, 1)} in FY${lastYear}).`
        );
      }
    } else {
      if (prospectScore.trendDirection === "worsening") {
        sentences.push(
          `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)} has been worsening over the past 3 years.`
        );
      } else if (prospectScore.trendDirection === "improving") {
        sentences.push(
          `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)} has been improving over the past 3 years.`
        );
      } else {
        sentences.push(
          `${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)} has been stable over the past 3 years.`
        );
      }
    }
  }

  // 3. Relevant operational areas (data-derived)
  const sectorUseCases = getUseCasesForSector(sector);
  const relevantUseCases: FounderNarrative["relevantUseCases"] = [];

  for (const uc of sectorUseCases.slice(0, 3)) {
    let reasoning = "";
    const painMetric = uc.painMetrics[0];
    const painVal = metrics[painMetric];
    const sectorAvg = sectorAverages[painMetric];

    if (painVal != null && sectorAvg != null) {
      const diff = painVal - sectorAvg;
      if (diff > 0) {
        reasoning = `${formatPercent(diff, 1)} points above sector average on ${painMetric.replace(/_/g, " ")}`;
      } else {
        reasoning = `At or below sector average on ${painMetric.replace(/_/g, " ")}`;
      }
    } else {
      reasoning = `Applicable to ${sector} sector`;
    }

    relevantUseCases.push({
      id: uc.id,
      name: uc.name,
      reasoning,
    });
  }

  // 4. Score summary (enhanced)
  if (prospectScore?.totalScore != null) {
    const tier = prospectScore.totalScore >= 70 ? "high" : prospectScore.totalScore >= 40 ? "moderate" : "low";
    const trendSuffix = prospectScore.trendDirection === "worsening"
      ? " with a worsening trend"
      : prospectScore.trendDirection === "improving"
        ? " with an improving trend"
        : "";
    sentences.push(
      `Composite score: ${prospectScore.totalScore}/100 — ${tier} operational inefficiency${trendSuffix}.`
    );
  }

  return { hookSentence, sentences, relevantUseCases, companyType };
}
