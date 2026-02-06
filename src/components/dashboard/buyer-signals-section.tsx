import { Card } from "@/components/ui/card";
import { SectorBadge } from "./sector-badge";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { type BuyerSignal, type SignalType } from "@/lib/analysis/buyer-signals";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BuyerSignalsSectionProps {
  signals: BuyerSignal[];
}

const CRITICAL_SIGNALS: SignalType[] = ["crossed_100", "roe_declining"];

function isCritical(signalTypes: SignalType[]): boolean {
  return signalTypes.some((s) => CRITICAL_SIGNALS.includes(s));
}

export function BuyerSignalsSection({ signals }: BuyerSignalsSectionProps) {
  if (signals.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-2xl font-display tracking-tight">
          Stress Signals
        </h2>
        <span className="text-xs text-muted-foreground">
          Companies with financial signals indicating readiness for
          AI/automation solutions
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => {
          const critical = isCritical(signal.signals);
          return (
            <Link
              key={signal.companyId}
              href={`/companies/${signal.ticker.toLowerCase()}`}
              className="group"
            >
              <Card
                className={cn(
                  "border-l-[2px] p-4 h-full transition-all duration-200",
                  "group-hover:shadow-md group-hover:-translate-y-0.5",
                  critical
                    ? "border-l-red-500 bg-red-500/[0.02] dark:bg-red-500/[0.04]"
                    : "border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.04]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">
                      {signal.ticker}
                    </span>
                    <SectorBadge sector={signal.sector} className="text-[10px] px-1.5 py-0" />
                  </div>
                  <ScoreBadge score={signal.prospectScore} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {signal.name}
                </p>
                <div className="mt-2.5 flex items-start gap-1.5">
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                      critical ? "bg-red-500" : "bg-amber-500"
                    )}
                  />
                  <p className="text-xs leading-snug text-foreground/70">
                    {signal.signalDescription}
                  </p>
                </div>
                {signal.signals.length > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-3">
                    +{signal.signals.length - 1} more signal{signal.signals.length > 2 ? "s" : ""}
                  </p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
