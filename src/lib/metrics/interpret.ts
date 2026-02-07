import { METRIC_DEFINITIONS } from "./definitions";
import { formatMetricValue, formatCurrency, formatPercent } from "./formatters";

export type Verdict = "strong" | "good" | "neutral" | "weak" | "critical";
export type Sentiment = "positive" | "negative" | "neutral";

export interface MetricInterpretation {
  formattedValue: string;
  verdict: Verdict;
  plainEnglish: string;
  peerContext: string | null;
  dollarImpact: string | null;
  sentiment: Sentiment;
}

export interface InterpretContext {
  sector: string;
  sectorAvg: number | null;
  sectorMin: number | null;
  sectorMax: number | null;
  rank: number | null;
  totalInSector: number | null;
  premiumBase: number | null;
}

function verdictToSentiment(verdict: Verdict): Sentiment {
  if (verdict === "strong" || verdict === "good") return "positive";
  if (verdict === "weak" || verdict === "critical") return "negative";
  return "neutral";
}

function peerContextStr(
  metricName: string,
  value: number,
  ctx: InterpretContext,
): string | null {
  if (ctx.sectorAvg == null) return null;
  const def = METRIC_DEFINITIONS[metricName];
  const diff = value - ctx.sectorAvg;
  const absDiff = Math.abs(diff);

  if (def?.unit === "percent" || def?.unit === "ratio") {
    const direction = diff > 0 ? "above" : "below";
    return `${absDiff.toFixed(1)}${def.unit === "percent" ? "pp" : "x"} ${direction} ${ctx.sector} avg (${formatMetricValue(metricName, ctx.sectorAvg)})`;
  }

  if (ctx.rank != null && ctx.totalInSector != null) {
    return `#${ctx.rank} of ${ctx.totalInSector} in ${ctx.sector}`;
  }
  return null;
}

function interpretCombinedRatio(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  const gap = value - 100;
  let verdict: Verdict;
  let plainEnglish: string;

  if (value > 105) {
    verdict = "critical";
    plainEnglish = `Underwriting loss of $${gap.toFixed(2)} per $100 of premiums`;
  } else if (value > 100) {
    verdict = "weak";
    plainEnglish = `Slight underwriting loss — $${gap.toFixed(2)} per $100`;
  } else if (value > 95) {
    verdict = "neutral";
    plainEnglish = `Thin margin — keeping $${(100 - value).toFixed(2)} per $100`;
  } else {
    verdict = "strong";
    plainEnglish = `Strong underwriting profit — keeping $${(100 - value).toFixed(2)} per $100`;
  }

  let dollarImpact: string | null = null;
  if (value > 100 && ctx.premiumBase != null) {
    const losses = (gap / 100) * ctx.premiumBase;
    dollarImpact = `${formatCurrency(losses)} in underwriting losses`;
  }
  if (ctx.sectorMin != null && value > ctx.sectorMin && ctx.premiumBase != null) {
    const gapToBest = ((value - ctx.sectorMin) / 100) * ctx.premiumBase;
    const existing = dollarImpact ? `${dollarImpact}; ` : "";
    dollarImpact = `${existing}${formatCurrency(gapToBest)} gap to best-in-class`;
  }

  return {
    formattedValue: formatMetricValue("combined_ratio", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("combined_ratio", value, ctx),
    dollarImpact,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretExpenseRatio(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  let verdict: Verdict;
  let plainEnglish: string;

  if (ctx.sectorAvg != null) {
    const gap = value - ctx.sectorAvg;
    if (gap > 5) {
      verdict = "critical";
      plainEnglish = `Spending ${gap.toFixed(1)}pp more than peers on operations`;
    } else if (gap > 2) {
      verdict = "weak";
      plainEnglish = `Above-average operating costs (+${gap.toFixed(1)}pp vs peers)`;
    } else if (gap > -2) {
      verdict = "neutral";
      plainEnglish = "In line with sector average";
    } else if (gap > -5) {
      verdict = "good";
      plainEnglish = `More efficient than peers (${Math.abs(gap).toFixed(1)}pp below avg)`;
    } else {
      verdict = "strong";
      plainEnglish = `Best-in-class efficiency (${Math.abs(gap).toFixed(1)}pp below avg)`;
    }
  } else {
    verdict = "neutral";
    plainEnglish = `${formatPercent(value, 1)} of premiums spent on operations`;
  }

  let dollarImpact: string | null = null;
  if (ctx.sectorMin != null && value > ctx.sectorMin && ctx.premiumBase != null) {
    const excessCosts = ((value - ctx.sectorMin) / 100) * ctx.premiumBase;
    dollarImpact = `${formatCurrency(excessCosts)} in excess costs vs best-in-class`;
  }

  return {
    formattedValue: formatMetricValue("expense_ratio", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("expense_ratio", value, ctx),
    dollarImpact,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretLossRatio(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  let verdict: Verdict;
  if (value > 75) verdict = "critical";
  else if (value > 65) verdict = "weak";
  else if (value > 55) verdict = "neutral";
  else verdict = "good";

  const plainEnglish = `Paying out $${value.toFixed(0)} in claims per $100 of premiums`;

  let dollarImpact: string | null = null;
  if (ctx.sectorAvg != null && ctx.premiumBase != null) {
    const gap = value - ctx.sectorAvg;
    if (gap > 0) {
      dollarImpact = `${formatCurrency((gap / 100) * ctx.premiumBase)} above sector avg in claims`;
    }
  }

  return {
    formattedValue: formatMetricValue("loss_ratio", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("loss_ratio", value, ctx),
    dollarImpact,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretROE(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  let verdict: Verdict;
  let plainEnglish: string;

  if (value < 0) {
    verdict = "critical";
    plainEnglish = "Negative return on equity — may reflect write-downs, reserve charges, or capital restructuring";
  } else if (value < 5) {
    verdict = "weak";
    plainEnglish = "Minimal returns on shareholder capital";
  } else if (value < 10) {
    verdict = "neutral";
    plainEnglish = "Modest returns on equity";
  } else if (value < 15) {
    verdict = "good";
    plainEnglish = "Solid returns for an insurer";
  } else {
    verdict = "strong";
    plainEnglish = "Strong capital efficiency";
  }

  return {
    formattedValue: formatMetricValue("roe", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("roe", value, ctx),
    dollarImpact: null,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretMLR(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  const adminMargin = 100 - value;
  let verdict: Verdict;
  let plainEnglish: string;

  if (value > 88) {
    verdict = "weak";
    plainEnglish = `Only ${adminMargin.toFixed(1)}% of premiums left for admin and profit`;
  } else if (value > 83) {
    verdict = "neutral";
    plainEnglish = `Typical admin margin of ${adminMargin.toFixed(1)}%`;
  } else {
    verdict = "good";
    plainEnglish = `Healthy admin margin of ${adminMargin.toFixed(1)}%`;
  }

  let dollarImpact: string | null = null;
  if (ctx.premiumBase != null) {
    const adminPool = (adminMargin / 100) * ctx.premiumBase;
    dollarImpact = `${formatCurrency(adminPool)} admin margin pool`;
  }

  return {
    formattedValue: formatMetricValue("medical_loss_ratio", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("medical_loss_ratio", value, ctx),
    dollarImpact,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretDebtToEquity(
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  let verdict: Verdict;
  let plainEnglish: string;

  if (value > 2.0) {
    verdict = "critical";
    plainEnglish = `$${value.toFixed(1)} of debt per $1 of equity — highly leveraged`;
  } else if (value > 1.0) {
    verdict = "weak";
    plainEnglish = "Above-average leverage";
  } else if (value > 0.3) {
    verdict = "neutral";
    plainEnglish = "Moderate leverage";
  } else {
    verdict = "good";
    plainEnglish = "Conservative balance sheet";
  }

  return {
    formattedValue: formatMetricValue("debt_to_equity", value),
    verdict,
    plainEnglish,
    peerContext: peerContextStr("debt_to_equity", value, ctx),
    dollarImpact: null,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretCurrencyMetric(
  metricName: string,
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  const def = METRIC_DEFINITIONS[metricName];
  const label = def?.label ?? metricName.replace(/_/g, " ");

  let verdict: Verdict = "neutral";
  let plainEnglish = `${formatCurrency(value)} in ${label.toLowerCase()}`;

  if (metricName === "net_income" && value < 0) {
    verdict = "critical";
    plainEnglish = `Operating at a loss (${formatCurrency(value)})`;
  }

  const rankContext =
    ctx.rank != null && ctx.totalInSector != null
      ? `#${ctx.rank} of ${ctx.totalInSector} in ${ctx.sector} by ${label.toLowerCase()}`
      : null;

  return {
    formattedValue: formatMetricValue(metricName, value),
    verdict,
    plainEnglish,
    peerContext: rankContext,
    dollarImpact: null,
    sentiment: verdictToSentiment(verdict),
  };
}

function interpretFallback(
  metricName: string,
  value: number,
  ctx: InterpretContext,
): MetricInterpretation {
  const def = METRIC_DEFINITIONS[metricName];
  let verdict: Verdict = "neutral";

  if (ctx.sectorAvg != null && def) {
    const diff = value - ctx.sectorAvg;
    const absPctDiff = ctx.sectorAvg !== 0 ? Math.abs(diff / ctx.sectorAvg) * 100 : 0;

    if (absPctDiff > 10) {
      if (def.higher_is_better) {
        verdict = diff > 0 ? "good" : "weak";
      } else {
        verdict = diff < 0 ? "good" : "weak";
      }
    }
  }

  return {
    formattedValue: formatMetricValue(metricName, value),
    verdict,
    plainEnglish: formatMetricValue(metricName, value),
    peerContext: peerContextStr(metricName, value, ctx),
    dollarImpact: null,
    sentiment: verdictToSentiment(verdict),
  };
}

export function interpretMetric(
  metricName: string,
  value: number | null,
  ctx: InterpretContext,
): MetricInterpretation | null {
  if (value == null) return null;

  switch (metricName) {
    case "combined_ratio":
      return interpretCombinedRatio(value, ctx);
    case "expense_ratio":
      return interpretExpenseRatio(value, ctx);
    case "loss_ratio":
      return interpretLossRatio(value, ctx);
    case "roe":
      return interpretROE(value, ctx);
    case "medical_loss_ratio":
      return interpretMLR(value, ctx);
    case "debt_to_equity":
      return interpretDebtToEquity(value, ctx);
    case "revenue":
    case "net_premiums_earned":
    case "net_income":
    case "total_assets":
    case "investment_income":
      return interpretCurrencyMetric(metricName, value, ctx);
    default:
      return interpretFallback(metricName, value, ctx);
  }
}

export function interpretMetrics(
  metrics: Record<string, number | null>,
  sector: string,
  sectorAvgs: Record<string, { avg: number; min: number; max: number }>,
  premiumBase: number | null,
  ranks?: Record<string, { rank: number; total: number }>,
): Record<string, MetricInterpretation> {
  const result: Record<string, MetricInterpretation> = {};

  for (const [metricName, value] of Object.entries(metrics)) {
    if (value == null) continue;
    const avgData = sectorAvgs[metricName];
    const rankData = ranks?.[metricName];
    const def = METRIC_DEFINITIONS[metricName];

    const ctx: InterpretContext = {
      sector,
      sectorAvg: avgData?.avg ?? null,
      sectorMin: def?.higher_is_better === false ? avgData?.min ?? null : avgData?.max ?? null,
      sectorMax: def?.higher_is_better === false ? avgData?.max ?? null : avgData?.min ?? null,
      rank: rankData?.rank ?? null,
      totalInSector: rankData?.total ?? null,
      premiumBase,
    };

    const interp = interpretMetric(metricName, value, ctx);
    if (interp) result[metricName] = interp;
  }

  return result;
}
