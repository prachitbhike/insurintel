"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { type FinancialRow } from "@/types/company";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

interface FinancialTableProps {
  annualData: FinancialRow[];
  quarterlyData: FinancialRow[];
  years: string[];
}

export function FinancialTable({
  annualData,
  quarterlyData,
  years,
}: FinancialTableProps) {
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">(
    "annual"
  );

  const data = periodType === "annual" ? annualData : quarterlyData;
  const displayYears = years.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Data</CardTitle>
        <PeriodSelector value={periodType} onValueChange={setPeriodType} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Metric</TableHead>
              {displayYears.map((year) => (
                <TableHead key={year} className="text-right min-w-[100px]">
                  {year}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const def = METRIC_DEFINITIONS[row.metric_name];
              return (
                <TableRow key={row.metric_name}>
                  <TableCell className="font-medium">
                    {def?.label ?? row.metric_name.replace(/_/g, " ")}
                  </TableCell>
                  {displayYears.map((year) => (
                    <TableCell key={year} className="text-right font-mono text-sm">
                      {formatMetricValue(
                        row.metric_name,
                        row.values[year] ?? null
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={displayYears.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No financial data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
