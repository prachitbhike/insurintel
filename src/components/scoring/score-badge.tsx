import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  if (score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm border text-muted-foreground font-mono",
          size === "sm" && "h-5 w-8 text-[11px]",
          size === "md" && "h-6 w-10 text-xs",
          size === "lg" && "h-8 w-14 text-sm font-semibold",
          className
        )}
      >
        --
      </span>
    );
  }

  const tier =
    score >= 70
      ? "high"
      : score >= 40
        ? "medium"
        : "low";

  const tierLabel =
    tier === "high" ? "High" : tier === "medium" ? "Mid" : "Low";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-mono font-semibold",
        tier === "high" &&
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
        tier === "medium" &&
          "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20",
        tier === "low" &&
          "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20",
        size === "sm" && "h-5 gap-0.5 px-1.5 text-[11px]",
        size === "md" && "h-6 gap-0.5 px-1.5 text-xs cursor-help",
        size === "lg" && "h-8 gap-0.5 px-2 text-sm",
        className
      )}
    >
      {score}
      {size === "lg" ? (
        <span className="text-[11px] font-normal opacity-60">/100</span>
      ) : (
        <span className="text-[10px] font-normal opacity-60">{tierLabel}</span>
      )}
    </span>
  );

  if (size === "md" || size === "sm") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium">Efficiency Score (0-100)</p>
            <p>Weighted composite of four dimensions:</p>
            <ul className="list-disc pl-3.5 space-y-0.5">
              <li>Operational gap vs. sector peers (40%)</li>
              <li>Trend direction over 3 years (25%)</li>
              <li>Revenue scale (20%)</li>
              <li>Company size fit (15%)</li>
            </ul>
            <p className="text-muted-foreground">70+ = High, 40-69 = Mid, &lt;40 = Low</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
