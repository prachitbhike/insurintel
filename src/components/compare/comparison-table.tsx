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
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  companies: { ticker: string; name: string; sector: string }[];
  metrics: Record<string, Record<string, number | null>>;
}

export function ComparisonTable({
  companies,
  metrics,
}: ComparisonTableProps) {
  const metricNames = Object.keys(metrics);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Side-by-Side Comparison</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Metric</TableHead>
              {companies.map((c) => (
                <TableHead key={c.ticker} className="text-right min-w-[100px]">
                  {c.ticker}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricNames.map((metricName) => {
              const def = METRIC_DEFINITIONS[metricName];
              const values = companies.map(
                (c) => metrics[metricName]?.[c.ticker] ?? null
              );
              const nonNull = values.filter((v) => v !== null) as number[];
              const best = def?.higher_is_better
                ? Math.max(...nonNull)
                : Math.min(...nonNull);
              const worst = def?.higher_is_better
                ? Math.min(...nonNull)
                : Math.max(...nonNull);

              return (
                <TableRow key={metricName}>
                  <TableCell className="font-medium capitalize">
                    {def?.label ?? metricName.replace(/_/g, " ")}
                  </TableCell>
                  {values.map((value, i) => (
                    <TableCell
                      key={companies[i].ticker}
                      className={cn(
                        "text-right font-mono text-sm",
                        nonNull.length > 1 &&
                          value === best &&
                          "text-positive font-semibold",
                        nonNull.length > 1 &&
                          value === worst &&
                          value !== best &&
                          "text-negative"
                      )}
                    >
                      {formatMetricValue(metricName, value)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {metricNames.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={companies.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No comparison data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
