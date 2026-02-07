import Link from "next/link";
import { ExternalLink, Lightbulb } from "lucide-react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SectorBadge } from "@/components/dashboard/sector-badge";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { type KpiValue } from "@/types/company";
import { type Sector } from "@/types/database";
import { type MetricInterpretation, type Verdict } from "@/lib/metrics/interpret";
import { type FounderNarrative } from "@/lib/scoring/founder-narrative";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import {
  formatMetricValue,
  formatChangePct,
  getTrendDirection,
} from "@/lib/metrics/formatters";

interface SnapshotHeaderProps {
  company: {
    ticker: string;
    name: string;
    sector: Sector;
    sub_sector: string | null;
    cik: string;
  };
  kpis: KpiValue[];
  rankings: {
    metric_name: string;
    rank_in_sector: number;
    total_in_sector: number;
  }[];
  interpretations: Record<string, MetricInterpretation>;
  founderNarrative: FounderNarrative | null;
  prospectScore: number | null;
  quickTakeSentences: string[];
}

const sectorTopBorder: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Life: "border-t-emerald-500",
  Health: "border-t-violet-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
  Title: "border-t-teal-500",
  "Mortgage Insurance": "border-t-indigo-500",
};

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
  "P&C": ["combined_ratio", "expense_ratio", "net_premiums_earned", "roe"],
  Reinsurance: ["combined_ratio", "loss_ratio", "net_premiums_earned", "roe"],
  Health: ["medical_loss_ratio", "revenue", "net_income", "roe"],
  Life: [
    "roe",
    "net_premiums_earned",
    "investment_income",
    "book_value_per_share",
  ],
  Brokers: ["revenue", "net_income", "roe", "eps"],
};

export function SnapshotHeader({
  company,
  kpis,
  rankings,
  interpretations,
  founderNarrative,
  prospectScore,
  quickTakeSentences,
}: SnapshotHeaderProps) {
  const kpiMap = new Map(kpis.map((k) => [k.metric_name, k]));
  const rankMap = new Map(rankings.map((r) => [r.metric_name, r]));
  const heroMetrics = HERO_METRICS[company.sector] ?? [
    "roe",
    "net_income",
    "eps",
    "book_value_per_share",
  ];

  // Build brief sentences
  const briefSentences: string[] = [];
  if (founderNarrative?.hookSentence) {
    briefSentences.push(founderNarrative.hookSentence);
  } else if (quickTakeSentences.length > 0) {
    briefSentences.push(quickTakeSentences[0]);
  }
  if (founderNarrative) {
    for (const s of founderNarrative.sentences.slice(0, 2)) {
      if (briefSentences.length < 4) briefSentences.push(s);
    }
  }
  if (briefSentences.length < 3 && quickTakeSentences.length > 1) {
    for (const s of quickTakeSentences.slice(1)) {
      if (briefSentences.length < 4 && !briefSentences.includes(s))
        briefSentences.push(s);
    }
  }

  const useCases = founderNarrative?.relevantUseCases ?? [];

  return (
    <div
      className={cn(
        "border-t-2 space-y-4",
        sectorTopBorder[company.sector as Sector] ?? "",
      )}
    >
      {/* Row 1: Ticker + Name + Badges + SEC Link */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pt-5">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-3xl font-bold data-glow tracking-tight">
            {company.ticker}
          </h1>
          <span className="text-sm text-muted-foreground truncate">
            {company.name}
          </span>
          <SectorBadge sector={company.sector} />
          <ScoreBadge score={prospectScore} size="md" />
        </div>
        <Link
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K&dateb=&owner=include&count=10`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          SEC Filings
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Row 2: Sub-sector */}
      {company.sub_sector && (
        <p className="font-mono text-xs text-muted-foreground tracking-wider">
          {company.sector} &gt; {company.sub_sector}
        </p>
      )}

      {/* Row 3: Company Brief */}
      {briefSentences.length > 0 && (
        <Card className="rounded-sm border-primary/20 bg-secondary/30">
          <CardContent className="flex gap-2.5 pt-3.5 pb-3">
            <Lightbulb className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="space-y-1">
                {briefSentences.map((s, i) => (
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
                      href={`/opportunities?useCase=${uc.id}`}
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
      )}

      {/* Row 4: Hero KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {heroMetrics
          .filter((metricName) => {
            const kpi = kpiMap.get(metricName);
            return kpi?.current_value != null;
          })
          .map((metricName) => {
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
              <div
                key={metricName}
                className="relative rounded-sm border py-0 card-glow terminal-surface bg-card shadow-sm"
              >
                <div className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {def?.label ?? metricName.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1">
                    {interp && interp.verdict !== "neutral" && (
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            verdictDotColors[interp.verdict],
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            verdictColors[interp.verdict],
                          )}
                        >
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
                </div>
                <div className="px-4 pb-3 pt-0">
                  <div className="text-xl led-number data-glow font-semibold tracking-tight">
                    {formatMetricValue(
                      metricName,
                      kpi?.current_value ?? null,
                    )}
                  </div>
                  {interp &&
                    interp.plainEnglish !== interp.formattedValue && (
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
                        trend === "neutral" && "text-muted-foreground",
                      )}
                    >
                      <TrendIcon className="h-3 w-3" />
                      <span>
                        {formatChangePct(kpi.change_pct)} YoY
                        {rank &&
                          ` · #${rank.rank_in_sector} of ${rank.total_in_sector} in ${company.sector}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
