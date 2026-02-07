"use client";

import { useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";
import { MetricLabel } from "@/components/ui/metric-label";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { type Sector } from "@/types/database";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface DisruptionTarget {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  combinedRatio: number | null;
  expenseRatio: number | null;
  roe: number | null;
  automationSavings: number | null;
  trend: number[];
  prospectScore?: number | null;
  signalTag?: string | null;
  mlr: number | null;
  debtToEquity: number | null;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
}

interface DisruptionTargetsTableProps {
  targets: DisruptionTarget[];
  sector: Sector;
}

interface SectorColumnDef {
  label: string;
  metricName: string;
  description?: string;
  getValue: (t: DisruptionTarget) => number | null;
  accent?: "destructive" | "teal";
  formatAsCurrency?: boolean;
}

const TREND_METRIC_LABELS: Record<Sector, string> = {
  "P&C": "Combined Ratio",
  Reinsurance: "Combined Ratio",
  Health: "Medical Loss Ratio",
  Life: "ROE",
  Brokers: "ROE",
  Title: "ROE",
  "Mortgage Insurance": "Combined Ratio",
};

const SECTOR_TABLE: Record<Sector, {
  description: string;
  sortNote: string;
  cols: [SectorColumnDef, SectorColumnDef, SectorColumnDef, SectorColumnDef];
}> = {
  "P&C": {
    description: "Ranked by combined ratio (worst first). Companies in underwriting loss (>100%) are the strongest prospects for AI-driven cost reduction.",
    sortNote: "Worst combined ratio first",
    cols: [
      { label: "Combined", metricName: "combined_ratio", getValue: (t) => t.combinedRatio, accent: "destructive" },
      { label: "Expense", metricName: "expense_ratio", getValue: (t) => t.expenseRatio },
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Expense Gap $", metricName: "expense_ratio", description: "Dollar value of the expense ratio gap vs best-in-class.", getValue: (t) => t.automationSavings, accent: "teal", formatAsCurrency: true },
    ],
  },
  Reinsurance: {
    description: "Ranked by combined ratio (worst first). Underwriting discipline across the catastrophe cycle.",
    sortNote: "Worst combined ratio first",
    cols: [
      { label: "Combined", metricName: "combined_ratio", getValue: (t) => t.combinedRatio, accent: "destructive" },
      { label: "Expense", metricName: "expense_ratio", getValue: (t) => t.expenseRatio },
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Expense Gap $", metricName: "expense_ratio", description: "Dollar value of the expense ratio gap vs best-in-class.", getValue: (t) => t.automationSavings, accent: "teal", formatAsCurrency: true },
    ],
  },
  Health: {
    description: "Ranked by medical loss ratio (highest first). ACA mandates 80\u201385% MLR \u2014 companies near the ceiling have the tightest admin margins.",
    sortNote: "Highest MLR first",
    cols: [
      { label: "MLR", metricName: "medical_loss_ratio", getValue: (t) => t.mlr, accent: "destructive" },
      { label: "Admin Margin", metricName: "medical_loss_ratio", description: "100% minus MLR \u2014 the margin available for admin, profit, and technology.", getValue: (t) => t.mlr != null ? +(100 - t.mlr).toFixed(1) : null },
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Revenue", metricName: "revenue", getValue: (t) => t.revenue },
    ],
  },
  Life: {
    description: "Ranked by ROE (lowest first). Capital-heavy balance sheets make operational efficiency critical for life insurers.",
    sortNote: "Lowest ROE first",
    cols: [
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Net Income", metricName: "net_income", getValue: (t) => t.netIncome },
      { label: "Total Assets", metricName: "total_assets", getValue: (t) => t.totalAssets },
      { label: "D/E", metricName: "debt_to_equity", getValue: (t) => t.debtToEquity },
    ],
  },
  Brokers: {
    description: "Ranked by leverage (highest D/E first). M&A-fueled debt loads create pressure to grow efficiently into obligations.",
    sortNote: "Highest D/E first",
    cols: [
      { label: "D/E", metricName: "debt_to_equity", getValue: (t) => t.debtToEquity, accent: "destructive" },
      { label: "Revenue", metricName: "revenue", getValue: (t) => t.revenue },
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Net Income", metricName: "net_income", getValue: (t) => t.netIncome },
    ],
  },
  Title: {
    description: "Ranked by ROE (lowest first). Title insurers are revenue-driven with low capital intensity — efficiency drives shareholder returns.",
    sortNote: "Lowest ROE first",
    cols: [
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Revenue", metricName: "revenue", getValue: (t) => t.revenue },
      { label: "Net Income", metricName: "net_income", getValue: (t) => t.netIncome },
      { label: "D/E", metricName: "debt_to_equity", getValue: (t) => t.debtToEquity },
    ],
  },
  "Mortgage Insurance": {
    description: "Ranked by combined ratio (worst first). Mortgage insurers with elevated combined ratios are prime targets for claims automation and expense reduction.",
    sortNote: "Worst combined ratio first",
    cols: [
      { label: "Combined", metricName: "combined_ratio", getValue: (t) => t.combinedRatio, accent: "destructive" },
      { label: "Expense", metricName: "expense_ratio", getValue: (t) => t.expenseRatio },
      { label: "ROE", metricName: "roe", getValue: (t) => t.roe },
      { label: "Expense Gap $", metricName: "expense_ratio", description: "Dollar value of the expense ratio gap vs best-in-class.", getValue: (t) => t.automationSavings, accent: "teal", formatAsCurrency: true },
    ],
  },
};

export function DisruptionTargetsTable({
  targets,
  sector,
}: DisruptionTargetsTableProps) {
  const config = SECTOR_TABLE[sector];
  const filtered = targets;

  const formatColValue = useCallback(
    (col: SectorColumnDef, t: DisruptionTarget): string => {
      const v = col.getValue(t);
      if (v == null) return col.formatAsCurrency ? "Leader" : "N/A";
      if (col.formatAsCurrency) return formatCurrency(v);
      return formatMetricValue(col.metricName, v);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    const headers = ["#", "Ticker", "Name", "Score", ...config.cols.map((c) => c.label), "Signal"];
    const rows = filtered.map((t, i) => [
      String(i + 1),
      t.ticker,
      t.name,
      t.prospectScore != null ? String(t.prospectScore) : "—",
      ...config.cols.map((c) => formatColValue(c, t)),
      t.signalTag ?? "—",
    ]);
    return copyTableToClipboard(headers, rows);
  }, [filtered, config, formatColValue]);

  const handleCSV = useCallback(() => {
    const headers = ["Rank", "Ticker", "Name", "Score", ...config.cols.map((c) => c.label), "Signal"];
    const rows = filtered.map((t, i) => [
      String(i + 1),
      t.ticker,
      t.name,
      t.prospectScore != null ? String(t.prospectScore) : "—",
      ...config.cols.map((c) => formatColValue(c, t)),
      t.signalTag ?? "—",
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, "disruption-targets.csv");
  }, [filtered, config, formatColValue]);

  const colMaxes = useMemo(() =>
    config.cols.map((col) =>
      Math.max(...filtered.map((t) => Math.abs(col.getValue(t) ?? 0)), 1)
    ),
    [filtered, config]
  );

  return (
    <Card className="rounded-sm shadow-sm group">
      <CardHeader className="pb-1 pt-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <CardTitle className="text-2xl font-display tracking-tight">
            <span className="font-mono text-primary/40 mr-1">&gt;</span>
            Company Rankings
          </CardTitle>
          <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} />
          <span className="text-xs text-muted-foreground">
            {config.sortNote}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          {config.description}
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="max-h-[32rem] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-secondary/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 font-mono text-[11px] uppercase tracking-[0.12em]">#</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-[0.12em]">Company</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-[0.12em] w-14">Score</TableHead>
                {config.cols.map((col, ci) => (
                  <TableHead
                    key={ci}
                    className={cn(
                      "text-right font-mono text-[11px] uppercase tracking-[0.12em]",
                      col.accent === "teal" && "text-teal-600 dark:text-teal-400"
                    )}
                  >
                    <MetricLabel
                      metricName={col.metricName}
                      label={col.label}
                      description={col.description}
                      className={cn(
                        "font-mono text-[11px] uppercase tracking-[0.12em] justify-end",
                        col.accent === "teal" && "text-teal-600 dark:text-teal-400"
                      )}
                      iconClassName="h-3 w-3"
                    />
                  </TableHead>
                ))}
                <TableHead className="font-mono text-[11px] uppercase tracking-[0.12em] hidden lg:table-cell">Buyer Signal</TableHead>
                <TableHead className="text-right font-mono text-[11px] uppercase tracking-[0.12em] w-20">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dashed border-muted-foreground/40">Trend</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{TREND_METRIC_LABELS[sector]} over available fiscal years (FY2021–FY2024)</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => {
                const heatOpacity = Math.max(0, 0.06 - i * 0.006);

                return (
                  <TableRow
                    key={t.companyId}
                    className="even:bg-secondary/20"
                    style={
                      heatOpacity > 0
                        ? { backgroundColor: `oklch(0.577 0.245 27.325 / ${heatOpacity})` }
                        : undefined
                    }
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/companies/${t.ticker.toLowerCase()}`}
                        className="font-mono font-semibold text-sm hover:underline underline-offset-2 data-glow"
                      >
                        {t.ticker}
                      </Link>
                      <span className="ml-1.5 text-xs text-muted-foreground hidden md:inline">
                        {t.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={t.prospectScore ?? null} size="sm" />
                    </TableCell>
                    {config.cols.map((col, ci) => {
                      const val = col.getValue(t);
                      const barWidth = val != null && col.accent
                        ? (Math.abs(val) / colMaxes[ci]) * 100
                        : 0;
                      const barBg = col.accent === "teal"
                        ? "bg-teal-500/10"
                        : col.accent === "destructive"
                        ? "bg-destructive/10"
                        : undefined;

                      return (
                        <TableCell
                          key={ci}
                          className={cn(
                            "text-right text-sm tabular-nums font-mono",
                            col.accent === "teal" && "font-medium text-teal-600 dark:text-teal-400",
                            ci === 0 && "font-medium"
                          )}
                        >
                          <span className="relative inline-flex items-center justify-end w-full gap-1.5">
                            {barBg && barWidth > 0 && (
                              <span
                                className={cn("absolute right-0 top-0 bottom-0 rounded-sm", barBg)}
                                style={{ width: `${barWidth}%` }}
                              />
                            )}
                            <span className="relative">
                              {col.formatAsCurrency
                                ? (val != null
                                  ? formatCurrency(val)
                                  : <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Leader</span>)
                                : formatMetricValue(col.metricName, val)}
                            </span>
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="hidden lg:table-cell">
                      {t.signalTag ? (
                        <span className="text-xs leading-tight text-muted-foreground line-clamp-1">
                          {t.signalTag}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        {t.trend.length > 1 ? (
                          <Sparkline
                            data={t.trend}
                            color="var(--chart-1)"
                            height={22}
                            width={56}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No companies in this sector.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
