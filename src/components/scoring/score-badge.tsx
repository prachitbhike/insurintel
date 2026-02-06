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
          size === "sm" && "h-5 w-8 text-[10px]",
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
        size === "sm" && "h-5 gap-0.5 px-1.5 text-[10px]",
        size === "md" && "h-6 gap-0.5 px-1.5 text-xs cursor-help",
        size === "lg" && "h-8 gap-0.5 px-2 text-sm",
        className
      )}
    >
      {score}
      {size === "lg" ? (
        <span className="text-[10px] font-normal opacity-60">/100</span>
      ) : (
        <span className="text-[9px] font-normal opacity-60">{tierLabel}</span>
      )}
    </span>
  );

  if (size === "md" || size === "sm") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">
            Prospect score out of 100. 70+ = High, 40-69 = Medium, &lt;40 = Low.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
