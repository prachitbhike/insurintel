import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectorBadge } from "./sector-badge";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { type Sector } from "@/types/database";
import { cn } from "@/lib/utils";

export interface TopProspect {
  companyId: string;
  ticker: string;
  name: string;
  sector: Sector;
  prospectScore: number | null;
  hookSentence: string;
  dollarImpact: string | null;
  signalLine: string | null;
}

interface TopProspectsSectionProps {
  prospects: TopProspect[];
  compact?: boolean;
}

export function TopProspectsSection({ prospects, compact }: TopProspectsSectionProps) {
  if (prospects.length === 0) return null;

  if (compact) {
    return (
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Top Prospects
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Largest efficiency gaps
          </span>
        </div>
        <div className="space-y-2">
          {prospects.map((p) => (
            <Link
              key={p.companyId}
              href={`/companies/${p.ticker.toLowerCase()}`}
              className="group block"
            >
              <div
                className={cn(
                  "rounded-sm border border-border/30 p-2.5 transition-all duration-200",
                  "group-hover:border-primary/30 dark:group-hover:shadow-[0_0_12px_-4px_oklch(0.72_0.19_145/0.2)]",
                  "border-l-[2px] border-l-primary/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-xs shrink-0 data-glow">
                      {p.ticker}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {p.name}
                    </span>
                  </div>
                  <ScoreBadge score={p.prospectScore} size="sm" />
                </div>
                <p className="mt-1 font-mono text-[10px] leading-snug text-foreground/70 line-clamp-2">
                  {p.hookSentence}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-2xl font-display tracking-tight">
          <span className="font-mono text-primary/40 mr-1">&gt;</span>
          Top Prospects
        </h2>
        <span className="text-xs text-muted-foreground">
          Companies with the largest efficiency gaps and worsening trends
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {prospects.map((p) => (
          <Link
            key={p.companyId}
            href={`/companies/${p.ticker.toLowerCase()}`}
            className="group"
          >
            <Card
              className={cn(
                "p-4 h-full rounded-sm transition-all duration-200 card-glow",
                "group-hover:-translate-y-0.5",
                "border-l-[2px] border-l-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-sm shrink-0 data-glow">
                    {p.ticker}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <SectorBadge sector={p.sector} className="text-[10px] px-1.5 py-0" />
                  <ScoreBadge score={p.prospectScore} size="sm" />
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                <p className="text-xs leading-snug text-foreground/80">
                  {p.hookSentence}
                </p>
                {p.dollarImpact && (
                  <p className="text-xs font-medium text-foreground/70">
                    {p.dollarImpact}
                  </p>
                )}
                {p.signalLine && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {p.signalLine}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
