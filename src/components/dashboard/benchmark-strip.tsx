import { Card, CardContent } from "@/components/ui/card";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { Trophy } from "lucide-react";

export interface BenchmarkEntry {
  label: string;
  metricName: string;
  value: number | null;
  companyTicker: string;
  companyName: string;
}

interface BenchmarkStripProps {
  benchmarks: BenchmarkEntry[];
}

export function BenchmarkStrip({ benchmarks }: BenchmarkStripProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Benchmark Targets</h2>
        <span className="text-xs text-muted-foreground">
          — the bar a founder needs to clear
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benchmarks.map((b) => (
          <Card key={b.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">{b.label}</p>
              <p className="text-xl font-bold tabular-nums">
                {formatMetricValue(b.metricName, b.value)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {b.companyTicker}{" "}
                <span className="hidden sm:inline">· {b.companyName}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
