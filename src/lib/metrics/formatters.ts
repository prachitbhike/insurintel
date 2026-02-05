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
