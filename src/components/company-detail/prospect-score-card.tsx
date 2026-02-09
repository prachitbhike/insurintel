import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ProspectScoreResult } from "@/lib/scoring/types";
import { formatCurrency } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

const SCORE_SEGMENTS = [
  { key: "painIntensity" as const, label: "Pain", color: "bg-rose-500", weight: "50%" },
  { key: "abilityToPay" as const, label: "Budget", color: "bg-sky-500", weight: "20%" },
  { key: "urgency" as const, label: "Urgency", color: "bg-yellow-500", weight: "30%" },
];

function tierColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getSegmentExplanation(
  key: string,
  ps: ProspectScoreResult,
): string | null {
  switch (key) {
    case "painIntensity": {
      if (ps.painMetricName && ps.painVsSectorAvg != null) {
        const label = ps.painMetricName.replace(/_/g, " ");
        const gap = ps.painVsSectorAvg;
        if (gap > 0) return `${label} ${gap.toFixed(1)}pp above sector avg`;
        return `${label} near sector avg`;
      }
      return null;
    }
    case "abilityToPay":
      return ps.revenueBase != null
        ? `${formatCurrency(ps.revenueBase)} in premiums`
        : null;
    case "urgency":
      return ps.trendDirection
        ? `${ps.trendDirection} trend`
        : null;
    default:
      return null;
  }
}

interface ProspectScoreCardProps {
  prospectScore: ProspectScoreResult;
}

export function ProspectScoreCard({ prospectScore }: ProspectScoreCardProps) {
  const score = prospectScore.totalScore;
  if (score == null) return null;

  const scoreColor =
    score >= 70
      ? "text-emerald-500"
      : score >= 40
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <Card className="rounded-sm terminal-surface">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Efficiency Score</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Operational efficiency gaps vs. sector peers, weighted by trend and scale.
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-3xl font-mono font-bold tabular-nums data-glow",
                scoreColor,
              )}
            >
              {score}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {SCORE_SEGMENTS.map((seg) => {
            const value = prospectScore[seg.key];
            if (value == null) return null;
            const explanation = getSegmentExplanation(seg.key, prospectScore);
            return (
              <div key={seg.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {seg.label}{" "}
                    <span className="text-muted-foreground/60">
                      ({seg.weight})
                    </span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {value}
                  </span>
                </div>
                <div className="h-2 rounded-sm overflow-hidden bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-sm transition-all duration-500",
                      tierColor(value),
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
                {explanation && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
