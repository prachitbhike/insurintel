import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

export interface HeroMetric {
  label: string;
  metricName: string;
  current: number | null;
  prior: number | null;
  deltaAbs: number | null;
  sparkline: number[];
  tooltip: string;
  isCount?: boolean;
  countTotal?: number;
  annotation?: string;
}

interface HeroBenchmarksV2Props {
  heroMetrics: HeroMetric[];
}

function DeltaBadge({
  metricName,
  current,
  prior,
  isCount,
}: {
  metricName: string;
  current: number | null;
  prior: number | null;
  isCount?: boolean;
}) {
  if (current == null || prior == null) return null;
  const delta = current - prior;
  if (Math.abs(delta) < 0.01) return null;

  const isPercent = ["combined_ratio", "expense_ratio", "roe", "medical_loss_ratio"].includes(metricName);

  let label: string;
  if (isCount) {
    const sign = delta >= 0 ? "+" : "";
    label = `${sign}${delta.toFixed(0)}`;
  } else if (isPercent) {
    const sign = delta >= 0 ? "+" : "";
    label = `${sign}${delta.toFixed(1)}pts`;
  } else {
    const pctChange = prior !== 0 ? ((delta / Math.abs(prior)) * 100) : 0;
    const sign = pctChange >= 0 ? "+" : "";
    label = `${sign}${pctChange.toFixed(1)}%`;
  }

  const higherIsBetter = ["net_premiums_earned", "revenue", "roe"].includes(metricName);
  const isPositiveChange = delta > 0;
  const isGood = higherIsBetter ? isPositiveChange : !isPositiveChange;

  return (
    <span
      className={cn(
        "text-xs font-mono shrink-0 whitespace-nowrap",
        isGood ? "text-positive" : "text-negative"
      )}
    >
      {label}
    </span>
  );
}

export function HeroBenchmarksV2({
  heroMetrics,
}: HeroBenchmarksV2Props) {
  return (
    <div className="rounded-sm border border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/50">
        {heroMetrics.map((metric) => (
          <div key={metric.label} className="px-3 py-2.5 overflow-hidden min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground truncate">
                {metric.label}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{metric.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
              {metric.isCount ? (
                <p className="text-lg led-number data-glow tracking-tight font-semibold truncate">
                  {metric.current != null
                    ? `${metric.current} of ${metric.countTotal ?? "?"}`
                    : "N/A"}
                </p>
              ) : (
                <p className="text-lg led-number data-glow tracking-tight font-semibold shrink-0">
                  {formatMetricValue(metric.metricName, metric.current)}
                </p>
              )}
              <DeltaBadge
                metricName={metric.metricName}
                current={metric.current}
                prior={metric.prior}
                isCount={metric.isCount}
              />
            </div>
            {metric.annotation && (
              <p className="font-mono text-[11px] text-muted-foreground leading-snug mt-0.5">
                {metric.annotation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
