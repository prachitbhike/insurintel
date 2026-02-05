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
import { SectorBadge } from "./sector-badge";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { type Sector } from "@/types/database";

interface HighlightEntry {
  ticker: string;
  name: string;
  sector: Sector;
  value: number;
}

interface HighlightsTableProps {
  title: string;
  metricName: string;
  entries: HighlightEntry[];
}

export function HighlightsTable({
  title,
  metricName,
  entries,
}: HighlightsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-6">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right pr-6">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, i) => (
              <TableRow key={entry.ticker}>
                <TableCell className="pl-6 text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/companies/${entry.ticker}`}
                    className="font-medium hover:underline"
                  >
                    {entry.ticker}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
                    {entry.name}
                  </span>
                </TableCell>
                <TableCell>
                  <SectorBadge sector={entry.sector} />
                </TableCell>
                <TableCell className="text-right pr-6 font-mono text-sm">
                  {formatMetricValue(metricName, entry.value)}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
