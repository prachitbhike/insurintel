"use client";

import { Fragment } from "react";
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
import { MetricLabel } from "@/components/ui/metric-label";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  companies: { ticker: string; name: string; sector: string }[];
  metrics: Record<string, Record<string, number | null>>;
}

export function ComparisonTable({
  companies,
  metrics,
}: ComparisonTableProps) {
  // Filter out metrics where all companies have null values
  const metricNames = Object.keys(metrics).filter((metricName) => {
    const values = companies.map((c) => metrics[metricName]?.[c.ticker] ?? null);
    return values.some((v) => v !== null);
  });

  // Group metrics by category for readability
  const categoryOrder = ["underwriting", "health", "premiums", "profitability", "balance_sheet"];
  const grouped = metricNames.reduce<Record<string, string[]>>((acc, name) => {
    const cat = METRIC_DEFINITIONS[name]?.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(name);
    return acc;
  }, {});
  const orderedMetrics = categoryOrder.flatMap((cat) => grouped[cat] ?? []);
  // Append any uncategorized metrics
  const categorized = new Set(orderedMetrics);
  const remaining = metricNames.filter((m) => !categorized.has(m));
  const sortedMetrics = [...orderedMetrics, ...remaining];

  const categoryLabels: Record<string, string> = {
    underwriting: "Underwriting",
    health: "Health Metrics",
    premiums: "Premiums",
    profitability: "Profitability",
    balance_sheet: "Balance Sheet",
  };

  // Track which categories we've rendered headers for
  let lastCategory = "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Side-by-Side Comparison</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Metric</TableHead>
              {companies.map((c) => (
                <TableHead key={c.ticker} className="text-right min-w-[110px]">
                  <div className="font-semibold">{c.ticker}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">{c.sector}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metricName) => {
              const def = METRIC_DEFINITIONS[metricName];
              const values = companies.map(
                (c) => metrics[metricName]?.[c.ticker] ?? null
              );
              const nonNull = values.filter((v) => v !== null) as number[];
              const best =
                nonNull.length > 1
                  ? def?.higher_is_better
                    ? Math.max(...nonNull)
                    : Math.min(...nonNull)
                  : null;
              const worst =
                nonNull.length > 1
                  ? def?.higher_is_better
                    ? Math.min(...nonNull)
                    : Math.max(...nonNull)
                  : null;

              const category = def?.category ?? "other";
              const showCategoryHeader = category !== lastCategory;
              lastCategory = category;

              return (
                <Fragment key={metricName}>
                  {showCategoryHeader && categoryLabels[category] && (
                    <TableRow>
                      <TableCell
                        colSpan={companies.length + 1}
                        className="bg-muted/50 py-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {categoryLabels[category]}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">
                      <MetricLabel metricName={metricName} className="text-sm" iconClassName="h-3 w-3" />
                    </TableCell>
                    {values.map((value, i) => (
                      <TableCell
                        key={companies[i].ticker}
                        className={cn(
                          "text-right font-mono text-sm",
                          best !== null &&
                            value === best &&
                            "text-positive font-semibold",
                          worst !== null &&
                            value === worst &&
                            value !== best &&
                            "text-negative"
                        )}
                      >
                        {formatMetricValue(metricName, value)}
                      </TableCell>
                    ))}
                  </TableRow>
                </Fragment>
              );
            })}
            {sortedMetrics.length === 0 && (
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
