"use client";

import { useState, useCallback } from "react";
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
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { type FinancialRow } from "@/types/company";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { generateCSV, downloadCSV } from "@/lib/export/csv";
import { copyTableToClipboard } from "@/lib/export/clipboard";

interface FinancialTableProps {
  annualData: FinancialRow[];
  quarterlyData: FinancialRow[];
  years: string[];
  quarterlyPeriods: string[];
}

export function FinancialTable({
  annualData,
  quarterlyData,
  years,
  quarterlyPeriods,
}: FinancialTableProps) {
  const [periodType, setPeriodType] = useState<"annual" | "quarterly">(
    "annual"
  );

  const data = periodType === "annual" ? annualData : quarterlyData;
  const periods = periodType === "annual" ? years : quarterlyPeriods;
  const displayYears = periods.slice(0, periodType === "annual" ? 5 : 8);

  const getTableData = useCallback(() => {
    const headers = ["Metric", ...displayYears];
    const rows = data.map((row) => {
      const def = METRIC_DEFINITIONS[row.metric_name];
      const label = def?.label ?? row.metric_name.replace(/_/g, " ");
      return [label, ...displayYears.map((y) => formatMetricValue(row.metric_name, row.values[y] ?? null))];
    });
    return { headers, rows };
  }, [data, displayYears]);

  const handleCopy = useCallback(async () => {
    const { headers, rows } = getTableData();
    return copyTableToClipboard(headers, rows);
  }, [getTableData]);

  const handleCSV = useCallback(() => {
    const { headers, rows } = getTableData();
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `financials-${periodType}.csv`);
  }, [getTableData, periodType]);

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Financial Data</CardTitle>
          <ExportButtonGroup onCopy={handleCopy} onCSV={handleCSV} />
        </div>
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
