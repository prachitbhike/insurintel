"use client";

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
import { type Sector } from "@/types/database";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-1">
        <div className="flex items-baseline gap-3">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Disruption Targets
          </CardTitle>
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
            {targets.map((t, i) => (
              <TableRow
                key={t.companyId}
                className={cn(
                  i < 3 && "bg-destructive/[0.03]"
                )}
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
                  {formatMetricValue("combined_ratio", t.combinedRatio)}
                </TableCell>
                <TableCell className="text-right text-[13px] tabular-nums font-mono">
                  {formatMetricValue("expense_ratio", t.expenseRatio)}
                </TableCell>
                <TableCell className="text-right text-[13px] tabular-nums font-mono">
                  {formatMetricValue("roe", t.roe)}
                </TableCell>
                <TableCell className="text-right text-[13px] tabular-nums font-mono font-medium text-amber-600 dark:text-amber-400">
                  {t.automationSavings != null
                    ? formatCurrency(t.automationSavings)
                    : "—"}
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
