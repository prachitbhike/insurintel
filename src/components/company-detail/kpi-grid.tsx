import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { type KpiValue } from "@/types/company";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue, formatChangePct, getTrendDirection } from "@/lib/metrics/formatters";
import { type MetricInterpretation, type Verdict } from "@/lib/metrics/interpret";

interface KpiGridProps {
  kpis: KpiValue[];
  sector: string;
  rankings: { metric_name: string; rank_in_sector: number; total_in_sector: number }[];
  interpretations?: Record<string, MetricInterpretation>;
}

const verdictColors: Record<Verdict, string> = {
  strong: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  weak: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
};

const verdictDotColors: Record<Verdict, string> = {
  strong: "bg-emerald-500",
  good: "bg-emerald-500",
  neutral: "bg-muted-foreground/40",
  weak: "bg-amber-500",
  critical: "bg-red-500",
};

const HERO_METRICS: Record<string, string[]> = {
  "P&C":       ["combined_ratio", "expense_ratio", "net_premiums_earned", "roe"],
  Reinsurance: ["combined_ratio", "loss_ratio", "net_premiums_earned", "roe"],
  Health:      ["medical_loss_ratio", "revenue", "net_income", "roe"],
  Life:        ["roe", "net_premiums_earned", "investment_income", "book_value_per_share"],
  Brokers:     ["revenue", "net_income", "roe", "eps"],
};

export function KpiGrid({ kpis, sector, rankings, interpretations }: KpiGridProps) {
  const kpiMap = new Map(kpis.map((k) => [k.metric_name, k]));
  const rankMap = new Map(rankings.map((r) => [r.metric_name, r]));
  const heroMetrics = HERO_METRICS[sector] ?? ["roe", "net_income", "eps", "book_value_per_share"];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {heroMetrics.filter((metricName) => {
        const kpi = kpiMap.get(metricName);
        return kpi?.current_value != null;
      }).map((metricName) => {
        const def = METRIC_DEFINITIONS[metricName];
        const kpi = kpiMap.get(metricName);
        const rank = rankMap.get(metricName);
        const trend = getTrendDirection(metricName, kpi?.change_pct);
        const interp = interpretations?.[metricName];
        const TrendIcon =
          trend === "positive"
            ? TrendingUp
            : trend === "negative"
              ? TrendingDown
              : Minus;

        return (
          <Card key={metricName} className="relative py-0 rounded-sm card-glow terminal-surface">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {def?.label ?? metricName.replace(/_/g, " ")}
              </CardTitle>
              <div className="flex items-center gap-1">
                {interp && interp.verdict !== "neutral" && (
                  <div className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", verdictDotColors[interp.verdict])} />
                    <span className={cn("text-xs font-medium", verdictColors[interp.verdict])}>
                      {interp.verdict}
                    </span>
                  </div>
                )}
                {def?.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{def.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-xl led-number data-glow font-semibold tracking-tight">
                {formatMetricValue(metricName, kpi?.current_value ?? null)}
              </div>
              {interp && interp.plainEnglish !== interp.formattedValue && (
                <p className="mt-0.5 text-xs leading-snug text-foreground/60">
                  {interp.plainEnglish}
                </p>
              )}
              {kpi?.change_pct != null && (
                <div
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-xs font-medium",
                    trend === "positive" && "text-positive",
                    trend === "negative" && "text-negative",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  <span>
                    {formatChangePct(kpi.change_pct)} YoY
                    {rank && ` · #${rank.rank_in_sector} of ${rank.total_in_sector} in ${sector}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
