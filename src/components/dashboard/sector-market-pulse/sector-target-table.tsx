"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { ScoreBadge } from "@/components/scoring/score-badge";
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatPerShare,
} from "@/lib/metrics/formatters";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type CarrierData } from "@/lib/queries/sector-dashboard";
import { type TargetColumnDef } from "@/lib/data/sector-dashboard-config";

interface SectorTargetTableProps {
  carriers: CarrierData[];
  years: number[];
  columns: TargetColumnDef[];
  sectorMedians: Record<string, number>;
  sectorLabel: string;
  csvFilename: string;
}

type SortDir = "asc" | "desc";

function getMetricTrend(
  carrier: CarrierData,
  metricName: string,
  years: number[]
): { values: (number | null)[]; direction: "improving" | "worsening" | "flat" } {
  const recentYears = years.slice(-3);
  const values = recentYears.map(
    (y) => carrier.metricsByYear[y]?.[metricName] ?? null
  );

  const nonNull = values.filter((v): v is number => v != null);
  if (nonNull.length < 2) return { values, direction: "flat" };

  const first = nonNull[0];
  const last = nonNull[nonNull.length - 1];
  const diff = last - first;

  // For ratios like expense_ratio/MLR: lower = better, so decrease = improving
  // For ROE: higher = better, so increase = improving
  const higherIsWorseMetrics = [
    "expense_ratio", "loss_ratio", "combined_ratio", "medical_loss_ratio", "debt_to_equity"
  ];
  const isHigherWorse = higherIsWorseMetrics.includes(metricName);

  if (Math.abs(diff) < 0.3) return { values, direction: "flat" };
  if (isHigherWorse) {
    return { values, direction: diff < 0 ? "improving" : "worsening" };
  }
  return { values, direction: diff > 0 ? "improving" : "worsening" };
}

function Sparkline({ values }: { values: (number | null)[] }) {
  const nonNull = values.filter((v): v is number => v != null);
  if (nonNull.length < 2) return <span className="text-muted-foreground text-xs">--</span>;

  const min = Math.min(...nonNull);
  const max = Math.max(...nonNull);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const pad = 2;

  const points = values
    .map((v, i) => {
      if (v == null) return null;
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-muted-foreground"
      />
    </svg>
  );
}

function SortHeader({
  label,
  sortKeyName,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sortKeyName: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = sortKey === sortKeyName;
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => onSort(sortKeyName)}
    >
      <div className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider">
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

function getRoeColor(roe: number | null, quartiles: { q1: number; q2: number; q3: number }): string {
  if (roe == null) return "";
  if (roe >= quartiles.q3) return "text-emerald-600 dark:text-emerald-400";
  if (roe >= quartiles.q2) return "text-emerald-600/70 dark:text-emerald-400/70";
  if (roe >= quartiles.q1) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatColumnValue(value: number | null, format: string): string {
  if (value == null) return "N/A";
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return formatPercent(value, 1);
    case "ratio": return formatRatio(value, 1);
    case "per_share": return formatPerShare(value, 2);
    default: return String(value);
  }
}

function getCellValue(
  carrier: CarrierData,
  col: TargetColumnDef,
  sectorMedians: Record<string, number>,
): number | null {
  if (col.peerDiffMetric) {
    const val = carrier.latest[col.peerDiffMetric];
    const median = sectorMedians[col.peerDiffMetric];
    if (val != null && median != null) return val - median;
    return null;
  }
  if (col.key === "expense_costs") {
    const er = carrier.latest.expense_ratio;
    const premiums = carrier.latest.net_premiums_earned;
    if (er != null && premiums != null && premiums > 0) {
      return (er / 100) * premiums;
    }
    return null;
  }
  if (col.key === "admin_margin") {
    const mlr = carrier.latest.medical_loss_ratio;
    const premiums = carrier.latest.net_premiums_earned;
    if (mlr != null && premiums != null && premiums > 0) {
      return ((100 - mlr) / 100) * premiums;
    }
    return null;
  }
  if (col.metric) {
    return carrier.latest[col.metric] ?? null;
  }
  return null;
}

export function SectorTargetTable({
  carriers,
  years,
  columns,
  sectorMedians,
  sectorLabel,
  csvFilename,
}: SectorTargetTableProps) {
  const [sortKey, setSortKey] = useState<string>("prospect_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "ticker" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const enriched = useMemo(
    () =>
      carriers.map((c) => {
        const colValues: Record<string, number | null> = {};
        const colTrends: Record<string, { values: (number | null)[]; direction: "improving" | "worsening" | "flat" }> = {};

        for (const col of columns) {
          colValues[col.key] = getCellValue(c, col, sectorMedians);
          if (col.hasSparkline && col.metric) {
            colTrends[col.key] = getMetricTrend(c, col.metric, years);
          }
        }

        return { ...c, colValues, colTrends };
      }),
    [carriers, columns, years, sectorMedians]
  );

  // ROE quartile boundaries
  const roeQuartiles = useMemo(() => {
    const roes = enriched
      .map((c) => c.latest.roe)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    if (roes.length < 4) return { q1: 0, q2: 0, q3: 0 };
    return {
      q1: roes[Math.floor(roes.length * 0.25)],
      q2: roes[Math.floor(roes.length * 0.5)],
      q3: roes[Math.floor(roes.length * 0.75)],
    };
  }, [enriched]);

  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...enriched].sort((a, b) => {
      if (sortKey === "ticker") {
        return mult * a.ticker.localeCompare(b.ticker);
      }
      if (sortKey === "prospect_score") {
        const av = a.prospectScore;
        const bv = b.prospectScore;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return mult * (av - bv);
      }
      // Sort by column value
      const av = a.colValues[sortKey] ?? null;
      const bv = b.colValues[sortKey] ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return mult * (av - bv);
    });
  }, [enriched, sortKey, sortDir]);

  // Max values for bar indicators
  const maxBarValues = useMemo(() => {
    const maxes: Record<string, number> = {};
    for (const col of columns) {
      if (col.hasBarIndicator) {
        const vals = sorted
          .map((c) => c.colValues[col.key])
          .filter((v): v is number => v != null);
        maxes[col.key] = vals.length > 0 ? Math.max(...vals) : 1;
      }
    }
    return maxes;
  }, [sorted, columns]);

  const getTableData = useCallback(() => {
    const headers = ["Carrier", ...columns.map((c) => c.label), "Score"];
    const rows = sorted.map((c) => [
      `${c.ticker} - ${c.name}`,
      ...columns.map((col) => {
        const val = c.colValues[col.key];
        if (col.peerDiffMetric && val != null) {
          return `${val >= 0 ? "+" : ""}${val.toFixed(1)}pp`;
        }
        return formatColumnValue(val, col.format);
      }),
      c.prospectScore != null ? String(c.prospectScore) : "N/A",
    ]);
    return { headers, rows };
  }, [sorted, columns]);

  const handleCopy = useCallback(async () => {
    const { headers, rows } = getTableData();
    return copyTableToClipboard(headers, rows);
  }, [getTableData]);

  const handleCSV = useCallback(() => {
    const { headers, rows } = getTableData();
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, csvFilename);
  }, [getTableData, csvFilename]);

  const enableTop5 = carriers.length > 5;

  return (
    <Card className="rounded-sm group">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{sectorLabel} Target List</CardTitle>
          <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {sorted.length} companies sorted by {sortKey.replace(/_/g, " ")} · Click any column to sort
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Carrier" sortKeyName="ticker" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
              {columns.map((col) => (
                <SortHeader
                  key={col.key}
                  label={col.label}
                  sortKeyName={col.key}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right min-w-[90px]"
                />
              ))}
              <SortHeader label="Score" sortKeyName="prospect_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center min-w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c, rowIndex) => {
              const isTop5 = enableTop5 && sortKey === "prospect_score" && rowIndex < 5;

              return (
                <TableRow
                  key={c.ticker}
                  className={cn(
                    "hover:bg-muted/30",
                    isTop5 && "border-l-2 border-l-amber-500/70"
                  )}
                >
                  {/* Carrier */}
                  <TableCell>
                    <Link
                      href={`/companies/${c.ticker}`}
                      className="group/link inline-flex flex-col"
                    >
                      <span className="font-mono font-bold text-sm group-hover/link:text-primary transition-colors">
                        {c.ticker}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                        {c.name}
                      </span>
                    </Link>
                  </TableCell>

                  {/* Dynamic columns */}
                  {columns.map((col) => {
                    const val = c.colValues[col.key];

                    // Peer diff column
                    if (col.peerDiffMetric) {
                      return (
                        <TableCell key={col.key} className="text-right">
                          {val != null ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-mono",
                                val > 2
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : val < -2
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {val >= 0 ? "+" : ""}
                              {val.toFixed(1)}pp
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      );
                    }

                    // Bar indicator column
                    if (col.hasBarIndicator) {
                      const barMax = maxBarValues[col.key] ?? 1;
                      const barPct = val != null ? (val / barMax) * 100 : 0;
                      return (
                        <TableCell key={col.key} className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500/60"
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-sm">
                              {formatColumnValue(val, col.format)}
                            </span>
                          </div>
                        </TableCell>
                      );
                    }

                    // Sparkline column
                    if (col.hasSparkline) {
                      const trend = c.colTrends[col.key];
                      return (
                        <TableCell key={col.key} className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {trend && <Sparkline values={trend.values} />}
                            <span className="font-mono text-sm">
                              {val != null
                                ? formatColumnValue(val, col.format)
                                : "N/A"}
                            </span>
                            {trend?.direction === "improving" && (
                              <TrendingDown className="h-3 w-3 text-emerald-500" />
                            )}
                            {trend?.direction === "worsening" && (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            )}
                            {trend?.direction === "flat" && (
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      );
                    }

                    // Quartile color column
                    if (col.hasQuartileColor) {
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "text-right font-mono text-sm",
                            getRoeColor(val, roeQuartiles)
                          )}
                        >
                          {val != null
                            ? formatColumnValue(val, col.format)
                            : "N/A"}
                        </TableCell>
                      );
                    }

                    // Growth/change column (color positive/negative)
                    if (col.metric === "premium_growth_yoy") {
                      return (
                        <TableCell key={col.key} className="text-right">
                          {val != null ? (
                            <span
                              className={cn(
                                "font-mono text-sm",
                                val > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : val < 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground"
                              )}
                            >
                              {val >= 0 ? "+" : ""}
                              {formatPercent(val, 1)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      );
                    }

                    // Default column
                    return (
                      <TableCell key={col.key} className="text-right font-mono text-sm">
                        {formatColumnValue(val, col.format)}
                      </TableCell>
                    );
                  })}

                  {/* Score */}
                  <TableCell className="text-center">
                    <ScoreBadge score={c.prospectScore} size="sm" />
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center text-muted-foreground py-8"
                >
                  No company data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
