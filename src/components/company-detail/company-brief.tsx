import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FounderNarrative } from "@/lib/scoring/founder-narrative";

interface CompanyBriefProps {
  quickTakeSentences: string[];
  founderNarrative: FounderNarrative | null;
}

export function CompanyBrief({ quickTakeSentences, founderNarrative }: CompanyBriefProps) {
  const sentences: string[] = [];

  // Lead with hookSentence if available, otherwise fall back to quick take
  if (founderNarrative?.hookSentence) {
    sentences.push(founderNarrative.hookSentence);
  } else if (quickTakeSentences.length > 0) {
    sentences.push(quickTakeSentences[0]);
  }

  // Add founder narrative sentences (peer comparison + trend)
  if (founderNarrative) {
    for (const s of founderNarrative.sentences.slice(0, 2)) {
      if (sentences.length < 4) sentences.push(s);
    }
  }

  // Fill remaining from quick take if needed
  if (sentences.length < 3 && quickTakeSentences.length > 1) {
    for (const s of quickTakeSentences.slice(1)) {
      if (sentences.length < 4 && !sentences.includes(s)) sentences.push(s);
    }
  }

  if (sentences.length === 0) return null;

  const useCases = founderNarrative?.relevantUseCases ?? [];

  return (
    <Card className="rounded-sm border-primary/20 bg-secondary/30">
      <CardContent className="flex gap-2.5 pt-3.5 pb-3">
        <Lightbulb className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <div className="space-y-1">
            {sentences.map((s, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "font-mono text-sm leading-snug text-foreground/90"
                    : "text-xs leading-snug text-foreground/75"
                }
              >
                {s}
              </p>
            ))}
          </div>
          {useCases.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {useCases.map((uc) => (
                <Link
                  key={uc.id}
                  href={`/intel?useCase=${uc.id}`}
                >
                  <Badge
                    variant="secondary"
                    className="rounded-sm font-mono text-[10px] uppercase hover:bg-accent cursor-pointer px-1.5 py-0"
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
