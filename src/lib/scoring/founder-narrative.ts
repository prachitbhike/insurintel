import { type Sector } from "@/types/database";
import { type ProspectScoreResult } from "./types";
import { getUseCasesForSector } from "@/lib/data/use-cases";
import { formatCurrency, formatPercent } from "@/lib/metrics/formatters";

export interface FounderNarrative {
  sentences: string[];
  relevantUseCases: { id: string; name: string; reasoning: string }[];
  companyType: "acquirer" | "enterprise_customer" | "mid_market_customer" | "channel_partner";
}

interface NarrativeInput {
  companyName: string;
  ticker: string;
  sector: Sector;
  metrics: Record<string, number | null>;
  sectorAverages: Record<string, number | null>;
  prospectScore: ProspectScoreResult | null;
}

function classifyCompany(
  sector: Sector,
  revenue: number | null
): FounderNarrative["companyType"] {
  if (sector === "Brokers") return "channel_partner";
  if (revenue == null) return "mid_market_customer";
  if (revenue >= 50_000_000_000) return "acquirer";
  if (revenue >= 5_000_000_000) return "enterprise_customer";
  return "mid_market_customer";
}

const COMPANY_TYPE_LABELS: Record<FounderNarrative["companyType"], string> = {
  acquirer: "potential acquirer or strategic partner",
  enterprise_customer: "enterprise customer",
  mid_market_customer: "mid-market customer",
  channel_partner: "channel partner",
};

export function generateFounderNarrative(input: NarrativeInput): FounderNarrative {
  const { companyName, sector, metrics, sectorAverages, prospectScore } = input;
  const sentences: string[] = [];

  const revenue = metrics["revenue"] ?? metrics["net_premiums_earned"] ?? null;
  const companyType = classifyCompany(sector, revenue);

  // 1. Addressable inefficiency
  const expenseRatio = metrics["expense_ratio"];
  const sectorAvgExpenseRatio = sectorAverages["expense_ratio"];
  const premiums = metrics["net_premiums_earned"] ?? metrics["revenue"];

  if (expenseRatio != null && sectorAvgExpenseRatio != null && premiums != null && expenseRatio > sectorAvgExpenseRatio) {
    const gap = expenseRatio - sectorAvgExpenseRatio;
    const addressable = (gap / 100) * premiums;
    sentences.push(
      `${companyName} has ${formatCurrency(addressable)} in addressable inefficiency — their expense ratio of ${formatPercent(expenseRatio, 1)} is ${formatPercent(gap, 1)} points above the ${sector} average.`
    );
  } else if (revenue != null) {
    sentences.push(
      `${companyName} operates at ${revenue >= 50_000_000_000 ? "massive" : revenue >= 5_000_000_000 ? "significant" : "moderate"} scale with ${formatCurrency(revenue)} in revenue, making them a ${COMPANY_TYPE_LABELS[companyType]}.`
    );
  }

  // 2. Trend direction
  if (prospectScore?.trendDirection && prospectScore.painMetricName) {
    const metricLabel = prospectScore.painMetricName.replace(/_/g, " ");
    if (prospectScore.trendDirection === "worsening") {
      sentences.push(
        `Their ${metricLabel} has been worsening over the past 3 years, increasing urgency for automation solutions.`
      );
    } else if (prospectScore.trendDirection === "improving") {
      sentences.push(
        `Their ${metricLabel} has been improving, suggesting they may already be investing in operational efficiency.`
      );
    } else {
      sentences.push(
        `Their ${metricLabel} has been stable, indicating a window for new solutions before competitors pull ahead.`
      );
    }
  }

  // 3. Best-fit use cases
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
        reasoning = `Applicable based on sector and company profile`;
      }
    } else {
      reasoning = `Applicable based on ${sector} sector profile`;
    }

    relevantUseCases.push({
      id: uc.id,
      name: uc.name,
      reasoning,
    });
  }

  if (relevantUseCases.length > 0) {
    const names = relevantUseCases.slice(0, 2).map((uc) => uc.name);
    sentences.push(
      `Best-fit AI use cases: ${names.join(" and ")}${relevantUseCases.length > 2 ? ` (+${relevantUseCases.length - 2} more)` : ""}.`
    );
  }

  // 4. Customer classification
  sentences.push(
    `As a ${COMPANY_TYPE_LABELS[companyType]}, ${companyName} is best approached with ${
      companyType === "acquirer"
        ? "strategic partnership or M&A positioning"
        : companyType === "enterprise_customer"
          ? "enterprise sales motion with POC-to-contract pipeline"
          : companyType === "channel_partner"
            ? "distribution partnership or API integration"
            : "product-led growth or mid-market sales approach"
    }.`
  );

  // 5. Prospect score summary
  if (prospectScore?.totalScore != null) {
    const painLabel =
      (prospectScore.painIntensity ?? 0) >= 60
        ? "high"
        : (prospectScore.painIntensity ?? 0) >= 30
          ? "moderate"
          : "low";
    const urgencyLabel =
      prospectScore.trendDirection === "worsening"
        ? "rising"
        : prospectScore.trendDirection === "improving"
          ? "declining"
          : "stable";
    sentences.push(
      `Prospect score: ${prospectScore.totalScore}/100 (pain: ${painLabel}, urgency: ${urgencyLabel}).`
    );
  }

  return { sentences, relevantUseCases, companyType };
}
