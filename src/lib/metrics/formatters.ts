import numeral from "numeral";
import { getMetricDefinition } from "./definitions";

export function formatMetricValue(
  metricName: string,
  value: number | null | undefined
): string {
  if (value == null) return "N/A";

  const def = getMetricDefinition(metricName);
  if (!def) return formatNumber(value);

  switch (def.unit) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value, def.format_decimals);
    case "ratio":
      return formatRatio(value, def.format_decimals);
    case "per_share":
      return formatPerShare(value, def.format_decimals);
    case "number":
      return formatNumber(value);
    default:
      return formatNumber(value);
  }
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return numeral(value / 1e9).format("$0,0.0") + "T";
  if (abs >= 1e9) return numeral(value / 1e9).format("$0,0.0") + "B";
  if (abs >= 1e6) return numeral(value / 1e6).format("$0,0.0") + "M";
  if (abs >= 1e3) return numeral(value / 1e3).format("$0,0.0") + "K";
  return numeral(value).format("$0,0");
}

export function formatPercent(
  value: number,
  decimals: number = 1
): string {
  const fmt = `0,0.${"0".repeat(decimals)}`;
  return numeral(value).format(fmt) + "%";
}

export function formatRatio(
  value: number,
  decimals: number = 2
): string {
  const fmt = `0,0.${"0".repeat(decimals)}`;
  return numeral(value).format(fmt) + "x";
}

export function formatPerShare(
  value: number,
  decimals: number = 2
): string {
  const fmt = `$0,0.${"0".repeat(decimals)}`;
  return numeral(value).format(fmt);
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return numeral(value / 1e9).format("0,0.0") + "B";
  if (abs >= 1e6) return numeral(value / 1e6).format("0,0.0") + "M";
  if (abs >= 1e3) return numeral(value / 1e3).format("0,0.0") + "K";
  return numeral(value).format("0,0");
}

/**
 * Compact tick formatter for chart Y-axes.
 * Shows unit suffix inline, keeps labels short for axis readability.
 */
export function formatChartTick(value: number, unit: string): string {
  if (value === 0) {
    if (unit === "currency" || unit === "per_share") return "$0";
    if (unit === "percent") return "0%";
    if (unit === "ratio") return "0x";
    return "0";
  }

  switch (unit) {
    case "currency": {
      const abs = Math.abs(value);
      const sign = value < 0 ? "-" : "";
      if (abs >= 1e12) return `${sign}$${+(abs / 1e12).toFixed(1)}T`;
      if (abs >= 1e9) return `${sign}$${+(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
      if (abs >= 1e6) return `${sign}$${+(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
      if (abs >= 1e3) return `${sign}$${+(abs / 1e3).toFixed(0)}K`;
      return `${sign}$${abs.toFixed(0)}`;
    }
    case "percent":
      return `${Math.round(value * 10) / 10}%`;
    case "ratio":
      return `${Math.round(value * 10) / 10}x`;
    case "per_share":
      return `$${Math.round(value * 100) / 100}`;
    case "number": {
      const abs = Math.abs(value);
      const sign = value < 0 ? "-" : "";
      if (abs >= 1e9) return `${sign}${+(abs / 1e9).toFixed(1)}B`;
      if (abs >= 1e6) return `${sign}${+(abs / 1e6).toFixed(0)}M`;
      if (abs >= 1e3) return `${sign}${+(abs / 1e3).toFixed(0)}K`;
      return `${sign}${abs.toFixed(0)}`;
    }
    default:
      return String(Math.round(value * 10) / 10);
  }
}

/**
 * Returns the shared unit if all metrics have the same unit type, null if mixed.
 */
export function getSharedUnit(metricNames: string[]): string | null {
  const units = metricNames
    .map((m) => getMetricDefinition(m)?.unit)
    .filter(Boolean) as string[];
  if (units.length === 0) return null;
  return units.every((u) => u === units[0]) ? units[0] : null;
}

export function periodLabel(fiscalYear: number, fiscalQuarter: number | null): string {
  return fiscalQuarter ? `${fiscalYear} Q${fiscalQuarter}` : String(fiscalYear);
}

export function periodSortKey(fiscalYear: number, fiscalQuarter: number | null): number {
  return fiscalYear * 10 + (fiscalQuarter ?? 0);
}

export function formatChangePct(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${numeral(value).format("0.0")}%`;
}

export function getTrendDirection(
  metricName: string,
  changePct: number | null | undefined
): "positive" | "negative" | "neutral" {
  if (changePct == null || changePct === 0) return "neutral";
  const def = getMetricDefinition(metricName);
  if (!def) return changePct > 0 ? "positive" : "negative";

  if (def.higher_is_better) {
    return changePct > 0 ? "positive" : "negative";
  }
  return changePct < 0 ? "positive" : "negative";
}
