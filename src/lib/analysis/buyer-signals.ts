import { type Sector } from "@/types/database";
import { type BulkScoringData } from "@/lib/scoring/types";
import { type ProspectScoreResult } from "@/lib/scoring/types";

export type SignalType =
  | "roe_declining"
  | "efficiency_worsening"
  | "crossed_100"
  | "growth_decelerating"
  | "roe_below_sector";

export interface BuyerSignal {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  prospectScore: number | null;
  signals: SignalType[];
  signalDescription: string;
  primaryMetric: string;
  primaryMetricValue: number | null;
  primaryMetricDelta: number | null;
}

function getLatestTwoYears(
  ts: { fiscal_year: number; value: number }[] | undefined
): { current: number | null; prior: number | null; currentYear: number } {
  if (!ts || ts.length === 0) return { current: null, prior: null, currentYear: 0 };
  const sorted = [...ts].sort((a, b) => b.fiscal_year - a.fiscal_year);
  return {
    current: sorted[0]?.value ?? null,
    prior: sorted[1]?.value ?? null,
    currentYear: sorted[0]?.fiscal_year ?? 0,
  };
}

function checkROEDeclining(
  ts: { fiscal_year: number; value: number }[] | undefined
): { triggered: boolean; description: string; years: number; startVal: number; endVal: number } {
  if (!ts || ts.length < 3) return { triggered: false, description: "", years: 0, startVal: 0, endVal: 0 };
  const sorted = [...ts].sort((a, b) => b.fiscal_year - a.fiscal_year);

  let consecutiveDeclines = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].value < sorted[i + 1].value) {
      consecutiveDeclines++;
    } else {
      break;
    }
  }

  if (consecutiveDeclines >= 2) {
    const endVal = sorted[0].value;
    const startVal = sorted[consecutiveDeclines].value;
    return {
      triggered: true,
      description: `ROE fell ${consecutiveDeclines} consecutive years (${startVal.toFixed(1)}% \u2192 ${endVal.toFixed(1)}%)`,
      years: consecutiveDeclines,
      startVal,
      endVal,
    };
  }
  return { triggered: false, description: "", years: 0, startVal: 0, endVal: 0 };
}

function buildSectorAvgTimeseries(
  data: BulkScoringData,
  metricName: string,
  sector: Sector
): Map<number, number> {
  const sectorCompanies = data.companies.filter((c) => c.sector === sector);
  const yearValues = new Map<number, number[]>();

  for (const c of sectorCompanies) {
    const ts = data.timeseries[c.id]?.[metricName];
    if (!ts) continue;
    for (const entry of ts) {
      if (!yearValues.has(entry.fiscal_year)) yearValues.set(entry.fiscal_year, []);
      yearValues.get(entry.fiscal_year)!.push(entry.value);
    }
  }

  const result = new Map<number, number>();
  for (const [year, values] of yearValues) {
    result.set(year, values.reduce((s, v) => s + v, 0) / values.length);
  }
  return result;
}

export function computeBuyerSignals(
  data: BulkScoringData,
  scores: ProspectScoreResult[]
): BuyerSignal[] {
  const scoreMap = new Map(scores.map((s) => [s.companyId, s]));
  const signals: BuyerSignal[] = [];

  // Cache sector avg timeseries
  const sectorAvgCache = new Map<string, Map<number, number>>();
  function getSectorAvgTs(metric: string, sector: Sector) {
    const key = `${sector}:${metric}`;
    if (!sectorAvgCache.has(key)) {
      sectorAvgCache.set(key, buildSectorAvgTimeseries(data, metric, sector));
    }
    return sectorAvgCache.get(key)!;
  }

  for (const company of data.companies) {
    const companyTs = data.timeseries[company.id] ?? {};
    const companySignals: SignalType[] = [];
    const descriptions: string[] = [];
    let primaryMetric = "roe";
    let primaryMetricValue: number | null = null;
    let primaryMetricDelta: number | null = null;

    // 1. ROE declining 2+ consecutive years
    const roeCheck = checkROEDeclining(companyTs.roe);
    if (roeCheck.triggered) {
      companySignals.push("roe_declining");
      descriptions.push(roeCheck.description);
      primaryMetric = "roe";
      primaryMetricValue = roeCheck.endVal;
      primaryMetricDelta = roeCheck.endVal - roeCheck.startVal;
    }

    // 2. Efficiency worsening — expense ratio or combined ratio rising while sector holds/improves
    const efficiencyMetrics =
      company.sector === "P&C" || company.sector === "Reinsurance"
        ? ["expense_ratio", "combined_ratio"]
        : company.sector === "Health"
          ? ["medical_loss_ratio"]
          : ["expense_ratio"];

    for (const metric of efficiencyMetrics) {
      const ts = companyTs[metric];
      const { current, prior, currentYear } = getLatestTwoYears(ts);
      if (current == null || prior == null) continue;

      const sectorAvgTs = getSectorAvgTs(metric, company.sector);
      const sectorCurrent = sectorAvgTs.get(currentYear);
      const sectorPrior = sectorAvgTs.get(currentYear - 1);

      const companyDelta = current - prior;
      const sectorDelta =
        sectorCurrent != null && sectorPrior != null
          ? sectorCurrent - sectorPrior
          : 0;

      // Company worsening while sector stable or improving
      const isWorsening =
        metric === "medical_loss_ratio"
          ? companyDelta < -0.5 && sectorDelta >= -0.5 // MLR: lower = worse admin margin
          : companyDelta > 0.5 && sectorDelta <= 0.5;

      if (isWorsening && !companySignals.includes("efficiency_worsening")) {
        companySignals.push("efficiency_worsening");
        const label = metric === "medical_loss_ratio" ? "MLR" : metric === "combined_ratio" ? "Combined ratio" : "Expense ratio";
        const dir = metric === "medical_loss_ratio" ? "fell" : "rose";
        descriptions.push(`${label} ${dir} ${Math.abs(companyDelta).toFixed(1)}pts while sector held`);
        if (!primaryMetricDelta || Math.abs(companyDelta) > Math.abs(primaryMetricDelta)) {
          primaryMetric = metric;
          primaryMetricValue = current;
          primaryMetricDelta = companyDelta;
        }
      }
    }

    // 3. Crossed 100% — combined ratio crossed above 100%
    if (company.sector === "P&C" || company.sector === "Reinsurance") {
      const crTs = companyTs.combined_ratio;
      const { current, prior } = getLatestTwoYears(crTs);
      if (current != null && prior != null && current > 100 && prior <= 100) {
        companySignals.push("crossed_100");
        descriptions.push(`Combined ratio crossed 100% (${prior.toFixed(1)}% \u2192 ${current.toFixed(1)}%)`);
        primaryMetric = "combined_ratio";
        primaryMetricValue = current;
        primaryMetricDelta = current - prior;
      }
    }

    // 4. Growth decelerating — premium growth slowed YoY
    const growthMetric =
      company.sector === "Brokers" ? "revenue" : "net_premiums_earned";
    const growthTs = companyTs[growthMetric];
    if (growthTs && growthTs.length >= 3) {
      const sorted = [...growthTs].sort((a, b) => a.fiscal_year - b.fiscal_year);
      const len = sorted.length;
      if (len >= 3) {
        const g1 =
          sorted[len - 2].value > 0
            ? ((sorted[len - 1].value - sorted[len - 2].value) / Math.abs(sorted[len - 2].value)) * 100
            : null;
        const g0 =
          sorted[len - 3].value > 0
            ? ((sorted[len - 2].value - sorted[len - 3].value) / Math.abs(sorted[len - 3].value)) * 100
            : null;
        if (g1 != null && g0 != null && g1 > 0 && g0 > 0 && g1 < g0 - 2) {
          companySignals.push("growth_decelerating");
          descriptions.push(
            `Premium growth slowed (${g0.toFixed(1)}% \u2192 ${g1.toFixed(1)}%)`
          );
        }
      }
    }

    // 5. ROE dropped below sector average this year (was above)
    const roeTs = companyTs.roe;
    if (roeTs && roeTs.length >= 2) {
      const { current, prior, currentYear } = getLatestTwoYears(roeTs);
      const sectorAvg = getSectorAvgTs("roe", company.sector);
      const sectorCurrentAvg = sectorAvg.get(currentYear);
      const sectorPriorAvg = sectorAvg.get(currentYear - 1);

      if (
        current != null &&
        prior != null &&
        sectorCurrentAvg != null &&
        sectorPriorAvg != null &&
        current < sectorCurrentAvg &&
        prior >= sectorPriorAvg
      ) {
        companySignals.push("roe_below_sector");
        descriptions.push(
          `ROE dropped below sector avg (${current.toFixed(1)}% vs ${sectorCurrentAvg.toFixed(1)}%)`
        );
      }
    }

    if (companySignals.length > 0) {
      const score = scoreMap.get(company.id);
      // Set primary metric from latest if not already set by a specific signal
      if (primaryMetricValue == null) {
        const roeVal = data.latestMetrics[company.id]?.roe;
        if (roeVal != null) {
          primaryMetric = "roe";
          primaryMetricValue = roeVal;
        }
      }

      signals.push({
        companyId: company.id,
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        prospectScore: score?.totalScore ?? null,
        signals: companySignals,
        signalDescription: descriptions[0] ?? "",
        primaryMetric,
        primaryMetricValue,
        primaryMetricDelta,
      });
    }
  }

  // Sort by signal count desc, then prospect score desc
  signals.sort((a, b) => {
    if (b.signals.length !== a.signals.length) return b.signals.length - a.signals.length;
    return (b.prospectScore ?? 0) - (a.prospectScore ?? 0);
  });

  return signals.slice(0, 8);
}
