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
import { formatCurrency, formatPercent, formatMetricValue } from "@/lib/metrics/formatters";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type PCCarrierData } from "@/lib/queries/pc-dashboard";

interface BuyerLandscapeTableProps {
  carriers: PCCarrierData[];
  sectorMedianCombined: number;
  years: number[];
}

type SortKey =
  | "ticker"
  | "net_premiums"
  | "expense_trend"
  | "combined_vs_peers"
  | "roe"
  | "premium_growth"
  | "prospect_score"
  | "expense_costs";

type SortDir = "asc" | "desc";

function getExpenseRatioTrend(
  carrier: PCCarrierData,
  years: number[]
): { values: (number | null)[]; direction: "improving" | "worsening" | "flat" } {
  // Get last 3 years of expense ratio
  const recentYears = years.slice(-3);
  const values = recentYears.map(
    (y) => carrier.metricsByYear[y]?.expense_ratio ?? null
  );

  const nonNull = values.filter((v): v is number => v != null);
  if (nonNull.length < 2) return { values, direction: "flat" };

  const first = nonNull[0];
  const last = nonNull[nonNull.length - 1];
  const diff = last - first;

  // expense_ratio: lower is better, so decreasing = improving
  if (Math.abs(diff) < 0.3) return { values, direction: "flat" };
  return { values, direction: diff < 0 ? "improving" : "worsening" };
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
  sortKeyName: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
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

export function BuyerLandscapeTable({
  carriers,
  sectorMedianCombined,
  years,
}: BuyerLandscapeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("prospect_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (key: SortKey) => {
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
        const trend = getExpenseRatioTrend(c, years);
        const combined = c.latest.combined_ratio;
        const combinedDiff =
          combined != null ? combined - sectorMedianCombined : null;
        const expenseCosts =
          c.latest.expense_ratio != null && c.latest.net_premiums_earned != null && c.latest.net_premiums_earned > 0
            ? (c.latest.expense_ratio / 100) * c.latest.net_premiums_earned
            : null;

        return { ...c, trend, combinedDiff, expenseCosts };
      }),
    [carriers, years, sectorMedianCombined]
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
      let av: number | null = null;
      let bv: number | null = null;

      switch (sortKey) {
        case "ticker":
          return mult * a.ticker.localeCompare(b.ticker);
        case "net_premiums":
          av = a.latest.net_premiums_earned;
          bv = b.latest.net_premiums_earned;
          break;
        case "expense_trend":
          av = a.latest.expense_ratio;
          bv = b.latest.expense_ratio;
          break;
        case "combined_vs_peers":
          av = a.combinedDiff;
          bv = b.combinedDiff;
          break;
        case "roe":
          av = a.latest.roe;
          bv = b.latest.roe;
          break;
        case "premium_growth":
          av = a.latest.premium_growth_yoy;
          bv = b.latest.premium_growth_yoy;
          break;
        case "prospect_score":
          av = a.prospectScore;
          bv = b.prospectScore;
          break;
        case "expense_costs":
          av = a.expenseCosts;
          bv = b.expenseCosts;
          break;
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return mult * (av - bv);
    });
  }, [enriched, sortKey, sortDir]);

  // Max premiums for bar-width indicator
  const maxPremiums = useMemo(() => {
    const vals = sorted
      .map((c) => c.latest.net_premiums_earned)
      .filter((v): v is number => v != null);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [sorted]);

  const getTableData = useCallback(() => {
    const headers = [
      "Carrier",
      "Net Premiums",
      "Expense Trend",
      "Combined vs Peers",
      "ROE",
      "Premium Growth",
      "Score",
      "Expense $",
    ];
    const rows = sorted.map((c) => [
      `${c.ticker} - ${c.name}`,
      formatMetricValue("net_premiums_earned", c.latest.net_premiums_earned),
      formatMetricValue("expense_ratio", c.latest.expense_ratio),
      c.combinedDiff != null
        ? `${c.combinedDiff >= 0 ? "+" : ""}${c.combinedDiff.toFixed(1)}pp`
        : "N/A",
      formatMetricValue("roe", c.latest.roe),
      formatMetricValue("premium_growth_yoy", c.latest.premium_growth_yoy),
      c.prospectScore != null ? String(c.prospectScore) : "N/A",
      c.expenseCosts != null ? formatCurrency(c.expenseCosts) : "N/A",
    ]);
    return { headers, rows };
  }, [sorted]);

  const handleCopy = useCallback(async () => {
    const { headers, rows } = getTableData();
    return copyTableToClipboard(headers, rows);
  }, [getTableData]);

  const handleCSV = useCallback(() => {
    const { headers, rows } = getTableData();
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, "pc-buyer-landscape.csv");
  }, [getTableData]);

  return (
    <Card className="rounded-sm group">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">P&C Buyer Landscape</CardTitle>
          <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {sorted.length} carriers sorted by {sortKey.replace(/_/g, " ")} · Click any column to sort
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Carrier" sortKeyName="ticker" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[160px]" />
              <SortHeader label="Net Premiums" sortKeyName="net_premiums" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[130px]" />
              <SortHeader label="Expense Trend" sortKeyName="expense_trend" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[130px]" />
              <SortHeader label="Combined vs Peers" sortKeyName="combined_vs_peers" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[130px]" />
              <SortHeader label="ROE" sortKeyName="roe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[80px]" />
              <SortHeader label="Growth" sortKeyName="premium_growth" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[80px]" />
              <SortHeader label="Score" sortKeyName="prospect_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center min-w-[70px]" />
              <SortHeader label="Expense $" sortKeyName="expense_costs" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right min-w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c, rowIndex) => {
              const premPct =
                c.latest.net_premiums_earned != null
                  ? (c.latest.net_premiums_earned / maxPremiums) * 100
                  : 0;
              const isTop5 = sortKey === "prospect_score" && rowIndex < 5;

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

                  {/* Net Premiums with bar */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500/60"
                          style={{ width: `${premPct}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm">
                        {formatCurrency(c.latest.net_premiums_earned ?? 0)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Expense Ratio Trend */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Sparkline values={c.trend.values} />
                      <span className="font-mono text-sm">
                        {c.latest.expense_ratio != null
                          ? formatPercent(c.latest.expense_ratio, 1)
                          : "N/A"}
                      </span>
                      {c.trend.direction === "improving" && (
                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                      )}
                      {c.trend.direction === "worsening" && (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      )}
                      {c.trend.direction === "flat" && (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>

                  {/* Combined vs Peers */}
                  <TableCell className="text-right">
                    {c.combinedDiff != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-mono",
                          c.combinedDiff > 2
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : c.combinedDiff < -2
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {c.combinedDiff >= 0 ? "+" : ""}
                        {c.combinedDiff.toFixed(1)}pp
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>

                  {/* ROE */}
                  <TableCell
                    className={cn(
                      "text-right font-mono text-sm",
                      getRoeColor(c.latest.roe, roeQuartiles)
                    )}
                  >
                    {c.latest.roe != null
                      ? formatPercent(c.latest.roe, 1)
                      : "N/A"}
                  </TableCell>

                  {/* Premium Growth */}
                  <TableCell className="text-right">
                    {c.latest.premium_growth_yoy != null ? (
                      <span
                        className={cn(
                          "font-mono text-sm",
                          c.latest.premium_growth_yoy > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : c.latest.premium_growth_yoy < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        )}
                      >
                        {c.latest.premium_growth_yoy >= 0 ? "+" : ""}
                        {formatPercent(c.latest.premium_growth_yoy, 1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>

                  {/* Efficiency Score */}
                  <TableCell className="text-center">
                    <ScoreBadge score={c.prospectScore} size="sm" />
                  </TableCell>

                  {/* Expense $ */}
                  <TableCell className="text-right font-mono text-sm">
                    {c.expenseCosts != null
                      ? formatCurrency(c.expenseCosts)
                      : "N/A"}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No carrier data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
