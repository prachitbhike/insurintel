import { TrendingDown, TrendingUp } from "lucide-react";
import { type TopMover } from "@/lib/analysis/top-movers";
import { cn } from "@/lib/utils";

interface TopMoversSectionProps {
  deteriorating: TopMover[];
  improving: TopMover[];
}

function formatDelta(mover: TopMover): string {
  const sign = mover.direction === "deteriorating" ? "+" : "-";
  const isPercent = ["combined_ratio", "medical_loss_ratio", "roe"].includes(mover.metricName);

  if (isPercent) {
    return `${sign}${mover.deltaAbs.toFixed(1)}pts`;
  }
  const pctChange =
    mover.priorValue !== 0
      ? (mover.deltaAbs / Math.abs(mover.priorValue)) * 100
      : 0;
  return `${sign}${pctChange.toFixed(1)}%`;
}

function formatValue(mover: TopMover): string {
  const isPercent = ["combined_ratio", "medical_loss_ratio", "roe"].includes(mover.metricName);
  if (isPercent) return `${mover.currentValue.toFixed(1)}%`;
  return `${mover.currentValue.toFixed(1)}`;
}

export function TopMoversSection({
  deteriorating,
  improving,
}: TopMoversSectionProps) {
  if (deteriorating.length === 0 && improving.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-2xl font-display tracking-tight">
          Top Movers
        </h2>
        <span className="text-xs text-muted-foreground">
          Largest year-over-year changes in key underwriting metrics
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Deteriorating */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/[0.04] border-b border-border/40">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              Deteriorating
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {deteriorating.map((mover, i) => (
              <div
                key={mover.companyId}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                  {i + 1}.
                </span>
                <span className="font-mono font-semibold w-12 shrink-0">
                  {mover.ticker}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {mover.metricLabel}
                </span>
                <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                  {formatValue(mover)}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono tabular-nums font-medium shrink-0",
                    "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatDelta(mover)}
                </span>
              </div>
            ))}
            {deteriorating.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                No deteriorating companies found
              </div>
            )}
          </div>
        </div>

        {/* Improving */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/[0.04] border-b border-border/40">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Improving
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {improving.map((mover, i) => (
              <div
                key={mover.companyId}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                  {i + 1}.
                </span>
                <span className="font-mono font-semibold w-12 shrink-0">
                  {mover.ticker}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {mover.metricLabel}
                </span>
                <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                  {formatValue(mover)}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono tabular-nums font-medium shrink-0",
                    "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatDelta(mover)}
                </span>
              </div>
            ))}
            {improving.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                No improving companies found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
