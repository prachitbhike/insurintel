import { Crosshair } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { type FounderNarrative } from "@/lib/scoring/founder-narrative";

interface FounderInsightsProps {
  narrative: FounderNarrative;
  prospectScore: number | null;
}

export function FounderInsights({ narrative, prospectScore }: FounderInsightsProps) {
  if (narrative.sentences.length === 0) return null;

  return (
    <Card className="border-teal-500/20 bg-teal-500/[0.02]">
      <CardContent className="flex gap-3 pt-5 pb-4">
        <Crosshair className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              Founder Insights
            </h3>
            <ScoreBadge score={prospectScore} size="md" />
          </div>
          <div className="space-y-1.5">
            {narrative.sentences.map((s, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-sm leading-relaxed text-foreground/90"
                    : "text-sm leading-relaxed text-foreground/75"
                }
              >
                {s}
              </p>
            ))}
          </div>
          {narrative.relevantUseCases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {narrative.relevantUseCases.map((uc) => (
                <Link
                  key={uc.id}
                  href={`/intel?useCase=${uc.id}`}
                >
                  <Badge
                    variant="secondary"
                    className="text-xs hover:bg-accent cursor-pointer"
                  >
                    {uc.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
