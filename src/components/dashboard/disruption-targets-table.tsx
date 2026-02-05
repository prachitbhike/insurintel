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
import { formatMetricValue } from "@/lib/metrics/formatters";
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
  trend: number[];
}

interface DisruptionTargetsTableProps {
  targets: DisruptionTarget[];
}

export function DisruptionTargetsTable({
  targets,
}: DisruptionTargetsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Disruption Targets
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked by combined ratio (worst first) — biggest opportunities for
          automation-driven disruption
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Combined Ratio</TableHead>
              <TableHead className="text-right">Expense Ratio</TableHead>
              <TableHead className="text-right">ROE</TableHead>
              <TableHead className="text-right">5yr Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((t, i) => (
              <TableRow key={t.companyId}>
                <TableCell className="font-medium text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/companies/${t.ticker.toLowerCase()}`}
                    className="font-medium hover:underline"
                  >
                    {t.ticker}
                  </Link>
                  <span className="ml-1.5 text-xs text-muted-foreground hidden sm:inline">
                    {t.name}
                  </span>
                </TableCell>
                <TableCell>
                  <SectorBadge sector={t.sector} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricValue("combined_ratio", t.combinedRatio)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricValue("expense_ratio", t.expenseRatio)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricValue("roe", t.roe)}
                </TableCell>
                <TableCell className="flex justify-end">
                  {t.trend.length > 1 ? (
                    <Sparkline
                      data={t.trend}
                      color="hsl(var(--chart-1))"
                      height={24}
                      width={64}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
