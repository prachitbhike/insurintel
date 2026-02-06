import { cn } from "@/lib/utils";

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
          "inline-flex items-center justify-center rounded-md border text-muted-foreground font-mono",
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

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold",
        tier === "high" &&
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
        tier === "medium" &&
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
        tier === "low" &&
          "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20",
        size === "sm" && "h-5 w-8 text-[10px]",
        size === "md" && "h-6 w-10 text-xs",
        size === "lg" && "h-8 w-14 text-sm",
        className
      )}
    >
      {score}
    </span>
  );
}
