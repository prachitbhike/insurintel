import { formatMetricValue } from "@/lib/metrics/formatters";
import { MetricLabel } from "@/components/ui/metric-label";
import { Target } from "lucide-react";

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
      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary/60" />
          <h2 className="text-2xl font-display tracking-tight">
            Benchmark Targets
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          The bar a founder needs to clear
        </span>
      </div>
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-border/60 overflow-hidden bg-border/30">
        {benchmarks.map((b) => (
          <div
            key={b.label}
            className="bg-card px-4 py-4 space-y-1.5"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <MetricLabel metricName={b.metricName} label={b.label} className="text-[10px]" iconClassName="h-2.5 w-2.5" />
            </p>
            <p className="text-2xl font-display tabular-nums tracking-tight">
              {formatMetricValue(b.metricName, b.value)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/70">{b.companyTicker}</span>
              {b.companyName && (
                <span className="hidden sm:inline"> · {b.companyName}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
