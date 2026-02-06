"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Download,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatMetricValue } from "@/lib/metrics/formatters";
import { type Sector } from "@/types/database";

export interface ProspectRow {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  score: number | null;
  painMetricName: string | null;
  painMetricValue: number | null;
  painVsSectorAvg: number | null;
  trendDirection: "improving" | "worsening" | "stable" | null;
  revenueBase: number | null;
  addressableSpend: number | null;
}

type SortField =
  | "score"
  | "painMetricValue"
  | "painVsSectorAvg"
  | "revenueBase"
  | "addressableSpend";
type SortDir = "asc" | "desc";

interface ProspectTableProps {
  rows: ProspectRow[];
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">--</span>;
  const color =
    score >= 60
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : score >= 35
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
        : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20";
  return (
    <Badge variant="outline" className={`font-mono text-xs tabular-nums ${color}`}>
      {score}
    </Badge>
  );
}

function TrendIcon({ direction }: { direction: ProspectRow["trendDirection"] }) {
  if (direction === "worsening")
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
        <TrendingUp className="h-3 w-3" /> Worsening
      </span>
    );
  if (direction === "improving")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
        <TrendingDown className="h-3 w-3" /> Improving
      </span>
    );
  if (direction === "stable")
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="h-3 w-3" /> Stable
      </span>
    );
  return <span className="text-muted-foreground text-xs">--</span>;
}

function formatPainLabel(metricName: string | null): string {
  if (!metricName) return "--";
  return metricName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SortButton({
  field,
  currentField,
  currentDir,
  onClick,
  children,
}: {
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === currentField;
  return (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onClick(field)}
    >
      {children}
      {isActive ? (
        currentDir === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function ProspectTable({ rows }: ProspectTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [copied, setCopied] = useState(false);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [rows, sortField, sortDir]);

  const handleCopy = useCallback(async () => {
    const header = ["#", "Ticker", "Company", "Sector", "Score", "Pain Point", "Value", "vs Avg", "Trend", "Revenue", "Addressable $"];
    const csvRows = sorted.map((r, i) => [
      i + 1,
      r.ticker,
      r.name,
      r.sector,
      r.score ?? "",
      formatPainLabel(r.painMetricName),
      r.painMetricValue != null ? r.painMetricValue.toFixed(1) : "",
      r.painVsSectorAvg != null ? (r.painVsSectorAvg >= 0 ? "+" : "") + r.painVsSectorAvg.toFixed(1) : "",
      r.trendDirection ?? "",
      r.revenueBase ?? "",
      r.addressableSpend ?? "",
    ]);
    const text = [header, ...csvRows].map((row) => row.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }, [sorted]);

  const handleCSV = useCallback(() => {
    const header = ["Rank", "Ticker", "Company", "Sector", "Score", "Pain Point", "Value", "vs Avg", "Trend", "Revenue", "Addressable $"];
    const csvRows = sorted.map((r, i) => [
      i + 1,
      r.ticker,
      `"${r.name}"`,
      r.sector,
      r.score ?? "",
      formatPainLabel(r.painMetricName),
      r.painMetricValue != null ? r.painMetricValue.toFixed(1) : "",
      r.painVsSectorAvg != null ? r.painVsSectorAvg.toFixed(1) : "",
      r.trendDirection ?? "",
      r.revenueBase ?? "",
      r.addressableSpend ?? "",
    ]);
    const csv = [header, ...csvRows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opportunities.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} companies
        </p>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Copy table to clipboard</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={handleCSV}>
                <Download className="h-3 w-3" />
                <span className="text-xs">CSV</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Download CSV</p></TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>
                  <SortButton field="score" currentField={sortField} currentDir={sortDir} onClick={handleSort}>
                    Score
                  </SortButton>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dashed border-muted-foreground/40">Pain Point</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">The metric where this company most underperforms vs. sector average</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <SortButton field="painVsSectorAvg" currentField={sortField} currentDir={sortDir} onClick={handleSort}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-muted-foreground/40">vs Sector Avg</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">Difference from sector average in percentage points (pp). Positive = worse than average for this metric.</p>
                      </TooltipContent>
                    </Tooltip>
                  </SortButton>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dashed border-muted-foreground/40">Trend</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">3-year directional trend of the pain metric</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="revenueBase" currentField={sortField} currentDir={sortDir} onClick={handleSort}>
                    Revenue
                  </SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="addressableSpend" currentField={sortField} currentDir={sortDir} onClick={handleSort}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-muted-foreground/40">Expense Gap $</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">Dollar value of the expense ratio gap vs best-in-class. Formula: (company expense ratio - best) / 100 x net premiums earned.</p>
                      </TooltipContent>
                    </Tooltip>
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => (
                <TableRow key={row.companyId} className="group hover:bg-muted/30">
                  <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/companies/${row.ticker.toLowerCase()}`}
                      className="hover:underline"
                    >
                      <span className="font-mono text-xs font-semibold mr-1.5">{row.ticker}</span>
                      <span className="text-sm">{row.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {row.sector}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={row.score} />
                  </TableCell>
                  <TableCell>
                    {row.painMetricName ? (
                      <span className="text-sm">
                        <span className="text-muted-foreground">{formatPainLabel(row.painMetricName)}</span>{" "}
                        <span className="font-mono tabular-nums">
                          {row.painMetricValue != null
                            ? formatMetricValue(row.painMetricName, row.painMetricValue)
                            : "--"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.painVsSectorAvg != null ? (
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          row.painVsSectorAvg > 0
                            ? "text-red-600 dark:text-red-400"
                            : row.painVsSectorAvg < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {row.painVsSectorAvg >= 0 ? "+" : ""}
                        {row.painVsSectorAvg.toFixed(1)}pp
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TrendIcon direction={row.trendDirection} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {row.revenueBase != null
                      ? formatCurrency(row.revenueBase)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums font-semibold">
                    {row.addressableSpend != null
                      ? formatCurrency(row.addressableSpend)
                      : "--"}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No companies match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
