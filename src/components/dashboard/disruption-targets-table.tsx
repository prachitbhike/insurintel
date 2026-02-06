"use client";

import { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectorBadge } from "./sector-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";
import { MetricLabel } from "@/components/ui/metric-label";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { type Sector } from "@/types/database";
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
}

interface DisruptionTargetsTableProps {
  targets: DisruptionTarget[];
}

export function DisruptionTargetsTable({
  targets,
}: DisruptionTargetsTableProps) {
  const handleCopy = useCallback(async () => {
    const headers = ["#", "Ticker", "Name", "Sector", "Combined Ratio", "Expense Ratio", "ROE", "Automation $"];
    const rows = targets.map((t, i) => [
      String(i + 1),
      t.ticker,
      t.name,
      t.sector,
      formatMetricValue("combined_ratio", t.combinedRatio),
      formatMetricValue("expense_ratio", t.expenseRatio),
      formatMetricValue("roe", t.roe),
      t.automationSavings != null ? formatCurrency(t.automationSavings) : "—",
    ]);
    return copyTableToClipboard(headers, rows);
  }, [targets]);

  const handleCSV = useCallback(() => {
    const headers = ["Rank", "Ticker", "Name", "Sector", "Combined Ratio", "Expense Ratio", "ROE", "Automation Savings"];
    const rows = targets.map((t, i) => [
      String(i + 1),
      t.ticker,
      t.name,
      t.sector,
      formatMetricValue("combined_ratio", t.combinedRatio),
      formatMetricValue("expense_ratio", t.expenseRatio),
      formatMetricValue("roe", t.roe),
      t.automationSavings != null ? formatCurrency(t.automationSavings) : "—",
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, "disruption-targets.csv");
  }, [targets]);
  // Compute max values for inline bar normalization
  const maxCombined = Math.max(
    ...targets.map((t) => t.combinedRatio ?? 0),
    1
  );
  const maxAutomation = Math.max(
    ...targets.map((t) => t.automationSavings ?? 0),
    1
  );

  return (
    <Card className="shadow-sm group">
      <CardHeader className="pb-1">
        <div className="flex items-baseline gap-3">
          <CardTitle className="text-2xl font-display tracking-tight">
            Disruption Targets
          </CardTitle>
          <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} />
          <span className="text-xs text-muted-foreground">
            Worst combined ratio first
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Incumbents with the highest combined ratios present the biggest
          opportunities for automation-driven disruption.
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 text-[10px] font-medium uppercase tracking-wider">#</TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-wider">Company</TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-wider">Sector</TableHead>
              <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider">
                <MetricLabel metricName="combined_ratio" label="Combined" className="text-[10px] font-medium uppercase tracking-wider justify-end" iconClassName="h-2.5 w-2.5" />
              </TableHead>
              <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider">
                <MetricLabel metricName="expense_ratio" label="Expense" className="text-[10px] font-medium uppercase tracking-wider justify-end" iconClassName="h-2.5 w-2.5" />
              </TableHead>
              <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider">
                <MetricLabel metricName="roe" label="ROE" className="text-[10px] font-medium uppercase tracking-wider justify-end" iconClassName="h-2.5 w-2.5" />
              </TableHead>
              <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <MetricLabel metricName="expense_ratio" label="Automation $" description="Estimated savings if this company matched the best-in-class expense ratio. Formula: (company expense ratio - best) / 100 x net premiums." className="text-[10px] font-medium uppercase tracking-wider justify-end text-amber-600 dark:text-amber-400" iconClassName="h-2.5 w-2.5" />
              </TableHead>
              <TableHead className="text-right text-[10px] font-medium uppercase tracking-wider w-20">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((t, i) => {
              // Heat-fade: top rows get deeper red tint, fading by position
              const heatOpacity = Math.max(0, 0.06 - i * 0.006);
              const combinedBarWidth =
                t.combinedRatio != null
                  ? (t.combinedRatio / maxCombined) * 100
                  : 0;
              const automationBarWidth =
                t.automationSavings != null
                  ? (t.automationSavings / maxAutomation) * 100
                  : 0;

              return (
                <TableRow
                  key={t.companyId}
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
                      className="font-semibold text-[13px] hover:underline underline-offset-2"
                    >
                      {t.ticker}
                    </Link>
                    <span className="ml-1.5 text-[11px] text-muted-foreground hidden md:inline">
                      {t.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SectorBadge sector={t.sector} className="text-[10px]" />
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums font-mono font-medium">
                    <span className="relative inline-flex items-center justify-end w-full">
                      <span
                        className="absolute right-0 top-0 bottom-0 rounded-sm bg-destructive/10"
                        style={{ width: `${combinedBarWidth}%` }}
                      />
                      <span className="relative">
                        {formatMetricValue("combined_ratio", t.combinedRatio)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums font-mono">
                    {formatMetricValue("expense_ratio", t.expenseRatio)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums font-mono">
                    {formatMetricValue("roe", t.roe)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums font-mono font-medium text-amber-600 dark:text-amber-400">
                    <span className="relative inline-flex items-center justify-end w-full">
                      <span
                        className="absolute right-0 top-0 bottom-0 rounded-sm bg-amber-500/10"
                        style={{ width: `${automationBarWidth}%` }}
                      />
                      <span className="relative">
                        {t.automationSavings != null
                          ? formatCurrency(t.automationSavings)
                          : "—"}
                      </span>
                    </span>
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
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
