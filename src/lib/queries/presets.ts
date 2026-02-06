import { type SupabaseClient } from "@supabase/supabase-js";
import { type LatestMetric, type MetricTimeseries } from "@/types/database";

export interface ComparisonPreset {
  title: string;
  description: string;
  tickers: string[];
  category: "By Metric" | "By Size";
}

export async function computeDynamicPresets(
  supabase: SupabaseClient
): Promise<ComparisonPreset[]> {
  const presets: ComparisonPreset[] = [];

  try {
    // Fetch latest metrics for ranking
    const { data: latestMetrics } = await supabase
      .from("mv_latest_metrics")
      .select("ticker, company_name, sector, metric_name, metric_value")
      .returns<LatestMetric[]>();

    if (!latestMetrics || latestMetrics.length === 0) return presets;

    // Fetch timeseries for trend analysis
    const { data: tsData } = await supabase
      .from("mv_metric_timeseries")
      .select("ticker, metric_name, fiscal_year, metric_value")
      .in("metric_name", ["medical_loss_ratio", "expense_ratio"])
      .order("fiscal_year", { ascending: true })
      .returns<MetricTimeseries[]>();

    // Build lookup: ticker → metric_name → value
    const lookup = new Map<string, Map<string, number>>();
    for (const m of latestMetrics) {
      if (!lookup.has(m.ticker)) lookup.set(m.ticker, new Map());
      lookup.get(m.ticker)!.set(m.metric_name, m.metric_value);
    }

    // --- Most Inefficient P&C Carriers (top 5 by expense_ratio where sector = P&C) ---
    const pcExpense = latestMetrics
      .filter((m) => m.sector === "P&C" && m.metric_name === "expense_ratio" && m.metric_value != null)
      .sort((a, b) => b.metric_value - a.metric_value)
      .slice(0, 5);

    if (pcExpense.length >= 3) {
      presets.push({
        title: "Most Inefficient P&C Carriers",
        description: "P&C carriers with the highest expense ratios relative to peers.",
        tickers: pcExpense.map((m) => m.ticker),
        category: "By Metric",
      });
    }

    // --- Health Payers with Rising MLR (worst 5 by MLR YoY trend) ---
    if (tsData && tsData.length > 0) {
      const healthTickers = new Set(
        latestMetrics
          .filter((m) => m.sector === "Health")
          .map((m) => m.ticker)
      );

      const mlrByTicker = new Map<string, { year: number; value: number }[]>();
      for (const d of tsData) {
        if (d.metric_name === "medical_loss_ratio" && healthTickers.has(d.ticker)) {
          if (!mlrByTicker.has(d.ticker)) mlrByTicker.set(d.ticker, []);
          mlrByTicker.get(d.ticker)!.push({ year: d.fiscal_year, value: d.metric_value });
        }
      }

      // Compute YoY change for each
      const mlrTrends: { ticker: string; change: number }[] = [];
      for (const [ticker, points] of mlrByTicker) {
        const sorted = points.sort((a, b) => a.year - b.year);
        if (sorted.length >= 2) {
          const change = sorted[sorted.length - 1].value - sorted[sorted.length - 2].value;
          mlrTrends.push({ ticker, change });
        }
      }

      const risingMLR = mlrTrends
        .sort((a, b) => b.change - a.change) // Biggest increase first
        .slice(0, 5);

      if (risingMLR.length >= 3) {
        presets.push({
          title: "Health Payers with Rising MLR",
          description: "Health payers where medical loss ratio increased year-over-year.",
          tickers: risingMLR.map((m) => m.ticker),
          category: "By Metric",
        });
      }
    }

    // --- Largest Carriers by Premium Volume ---
    const premiumLeaders = latestMetrics
      .filter((m) => m.metric_name === "net_premiums_earned" && m.metric_value != null)
      .sort((a, b) => b.metric_value - a.metric_value)
      .slice(0, 5);

    if (premiumLeaders.length >= 3) {
      presets.push({
        title: "Largest by Premium Volume",
        description: "Companies with the largest net premiums earned across all sectors.",
        tickers: premiumLeaders.map((m) => m.ticker),
        category: "By Size",
      });
    }

    // --- Best vs Worst in Class (best + worst by combined_ratio + ROE) ---
    const combinedRatios = latestMetrics
      .filter((m) => m.metric_name === "combined_ratio" && m.metric_value != null)
      .sort((a, b) => a.metric_value - b.metric_value); // Lower = better

    const roeValues = latestMetrics
      .filter((m) => m.metric_name === "roe" && m.metric_value != null && Math.abs(m.metric_value) < 200) // exclude extreme outliers
      .sort((a, b) => b.metric_value - a.metric_value); // Higher = better

    const bestWorst = new Set<string>();
    if (combinedRatios.length >= 2) {
      bestWorst.add(combinedRatios[0].ticker);
      bestWorst.add(combinedRatios[combinedRatios.length - 1].ticker);
    }
    if (roeValues.length >= 2) {
      bestWorst.add(roeValues[0].ticker);
      bestWorst.add(roeValues[roeValues.length - 1].ticker);
    }

    if (bestWorst.size >= 3) {
      presets.push({
        title: "Best vs Worst in Class",
        description: "Top and bottom performers by combined ratio and ROE.",
        tickers: [...bestWorst].slice(0, 5),
        category: "By Metric",
      });
    }
  } catch {
    // Return whatever presets we've built so far
  }

  return presets;
}
