import { TrendingUp, TrendingDown, Minus, Brain, Cpu, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TechAdoptionSignal } from "@/types/tech-signals";

interface SignalsRowProps {
  techSignal: TechAdoptionSignal | null;
}

export function SignalsRow({ techSignal }: SignalsRowProps) {
  if (!techSignal) return null;

  const yoyChange = techSignal.yoy_density_change;
  const TrendIcon =
    yoyChange != null && yoyChange > 0
      ? TrendingUp
      : yoyChange != null && yoyChange < 0
        ? TrendingDown
        : Minus;
  const trendColor =
    yoyChange != null && yoyChange > 0
      ? "text-positive"
      : yoyChange != null && yoyChange < 0
        ? "text-negative"
        : "text-muted-foreground";

  const classificationLabel =
    techSignal.classification === "tech-forward"
      ? "High"
      : techSignal.classification === "in-transition"
        ? "Moderate"
        : "Low";
  const classificationColor =
    techSignal.classification === "tech-forward"
      ? "text-emerald-600 dark:text-emerald-400"
      : techSignal.classification === "in-transition"
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-sm border bg-card">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b">
        <FileText className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          10-K Signals (FY{techSignal.fiscal_year})
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x">
        {/* Tech Mentions */}
        <div className="px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Tech Mentions
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono font-semibold tabular-nums">
              {techSignal.total_tech_mentions}
            </span>
            {yoyChange != null && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {yoyChange > 0 ? "+" : ""}
                {yoyChange.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* AI/ML Refs */}
        <div className="px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            AI/ML Refs
          </p>
          <div className="flex items-baseline gap-1.5">
            <Brain className="h-3.5 w-3.5 text-muted-foreground/60 self-center" />
            <span className="text-lg font-mono font-semibold tabular-nums">
              {techSignal.ai_mention_count + techSignal.ml_mention_count}
            </span>
          </div>
        </div>

        {/* Automation */}
        <div className="px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Automation
          </p>
          <div className="flex items-baseline gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground/60 self-center" />
            <span className="text-lg font-mono font-semibold tabular-nums">
              {techSignal.automation_mention_count}
            </span>
          </div>
        </div>

        {/* Tech Density */}
        <div className="px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Tech Density
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-lg font-mono font-semibold tabular-nums", classificationColor)}>
              {classificationLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({techSignal.tech_density_score.toFixed(1)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
