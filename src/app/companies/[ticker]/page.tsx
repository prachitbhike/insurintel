import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompanyByTicker } from "@/lib/queries/companies";
import {
  getLatestMetrics,
  getCompanyFinancials,
} from "@/lib/queries/metrics";
import { getCompanyRankings, getSectorAverages } from "@/lib/queries/sectors";
import { getTechSignalsByCompany } from "@/lib/queries/tech-signals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectorBadge } from "@/components/dashboard/sector-badge";
import { PainChart } from "@/components/company-detail/pain-chart";
import { OpportunityPanel } from "@/components/company-detail/opportunity-panel";
import { ProspectScoreCard } from "@/components/company-detail/prospect-score-card";
import { SignalsRow } from "@/components/company-detail/signals-row";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue, formatChangePct, getTrendDirection } from "@/lib/metrics/formatters";
import { computeProspectScore } from "@/lib/scoring/prospect-score";
import { generateFounderNarrative } from "@/lib/scoring/founder-narrative";
import { computeOpportunityData } from "@/lib/company-detail/helpers";
import { type TimeseriesPoint } from "@/types/company";
import { COMPANIES_SEED } from "@/lib/data/companies-seed";
import { type Sector, type SectorAverage, type Company } from "@/types/database";
import { type TechAdoptionSignal } from "@/types/tech-signals";
import { type ProspectScoreResult } from "@/lib/scoring/types";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateStaticParams() {
  return COMPANIES_SEED.map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker).toUpperCase();
  const seed = COMPANIES_SEED.find((c) => c.ticker === decodedTicker);
  const name = seed?.name ?? decodedTicker;
  return {
    title: `${decodedTicker} - ${name}`,
    description: `Prospect profile for ${name} (${decodedTicker}). Efficiency score, pain metrics, and tech signals.`,
  };
}

/* ─── Hero KPI config per sector ─── */
const HERO_METRICS: Record<string, string[]> = {
  "P&C": ["combined_ratio", "expense_ratio", "net_premiums_earned", "roe"],
  Reinsurance: ["combined_ratio", "loss_ratio", "net_premiums_earned", "roe"],
  Health: ["medical_loss_ratio", "revenue", "net_income", "roe"],
  Life: ["roe", "net_premiums_earned", "investment_income", "book_value_per_share"],
  Brokers: ["revenue", "net_income", "roe", "eps"],
  Title: ["revenue", "net_income", "roe", "eps"],
  "Mortgage Insurance": ["combined_ratio", "expense_ratio", "net_premiums_earned", "roe"],
};

/* ─── Sector top border colors ─── */
const sectorBorder: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Life: "border-t-emerald-500",
  Health: "border-t-violet-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
  Title: "border-t-teal-500",
  "Mortgage Insurance": "border-t-indigo-500",
};

/* ─── Pain chart subtitle per sector ─── */
const PAIN_CHART_SUBTITLE: Record<string, string> = {
  "P&C": "Combined ratio = loss ratio + expense ratio. Below 100% = underwriting profit.",
  Reinsurance: "Combined ratio = loss ratio + expense ratio. Below 100% = underwriting profit.",
  Health: "Medical loss ratio vs ACA floor. Lower MLR = wider admin margin.",
  Life: "Return on equity trend. Higher = more efficient capital deployment.",
  Brokers: "Return on equity trend. Higher = more efficient capital deployment.",
  Title: "Return on equity trend. Higher = more efficient capital deployment.",
  "Mortgage Insurance": "Combined ratio = loss ratio + expense ratio. Below 100% = underwriting profit.",
};

export default async function CompanyDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker).toUpperCase();

  let company: Company;
  const timeseries: Record<string, TimeseriesPoint[]> = {};
  let prospectScoreResult: ProspectScoreResult | null = null;
  let hookSentence = "";
  let useCases: { id: string; name: string; reasoning: string }[] = [];
  let techSignals: TechAdoptionSignal[] = [];
  let sectorAvgsRecord: Record<string, number | null> = {};
  let opportunityData = {
    painMetricName: null as string | null,
    painMetricLabel: "",
    painMetricValue: null as number | null,
    sectorAvgPainMetric: null as number | null,
    sectorBestPainMetric: null as number | null,
    automationSavings: null as number | null,
  };

  // KPI data
  let kpiData: {
    metricName: string;
    label: string;
    value: number;
    changePct: number | null;
    rank: number | null;
    total: number | null;
  }[] = [];

  try {
    const supabase = await createClient();
    const maybeCompany = await getCompanyByTicker(supabase, decodedTicker);
    if (!maybeCompany) notFound();
    company = maybeCompany;

    const [latestMetrics, rankings, sectorAvgs, annualData, techSignalsData] =
      await Promise.all([
        getLatestMetrics(supabase, company.id),
        getCompanyRankings(supabase, company.id),
        getSectorAverages(supabase, company.sector),
        getCompanyFinancials(supabase, company.id, "annual"),
        getTechSignalsByCompany(supabase, company.id),
      ]);

    techSignals = techSignalsData;

    // Metrics lookups
    const metricsByName = new Map(latestMetrics.map((m) => [m.metric_name, m]));
    const rankingMap = new Map(rankings.map((r) => [r.metric_name, r]));

    // Prior year for YoY
    const priorYearData = new Map<string, number>();
    for (const d of annualData) {
      const latest = metricsByName.get(d.metric_name);
      if (latest && d.fiscal_year === latest.fiscal_year - 1) {
        priorYearData.set(d.metric_name, d.metric_value);
      }
    }

    // Build compact KPI data
    const heroMetrics = HERO_METRICS[company.sector] ?? HERO_METRICS["P&C"];
    kpiData = heroMetrics
      .filter((m) => metricsByName.has(m))
      .map((m) => {
        const metric = metricsByName.get(m)!;
        const prior = priorYearData.get(m);
        const changePct =
          prior != null && prior !== 0
            ? ((metric.metric_value - prior) / Math.abs(prior)) * 100
            : null;
        const rank = rankingMap.get(m);
        return {
          metricName: m,
          label: METRIC_DEFINITIONS[m]?.label ?? m.replace(/_/g, " "),
          value: metric.metric_value,
          changePct,
          rank: rank?.rank_in_sector ?? null,
          total: rank?.total_in_sector ?? null,
        };
      });

    // Build timeseries (annual only)
    for (const d of annualData) {
      if (!timeseries[d.metric_name]) timeseries[d.metric_name] = [];
      timeseries[d.metric_name].push({
        fiscal_year: d.fiscal_year,
        fiscal_quarter: null,
        value: d.metric_value,
      });
    }

    // Sector averages
    const sectorMinsRecord: Record<string, number | null> = {};
    const sectorMaxesRecord: Record<string, number | null> = {};
    for (const avg of sectorAvgs as SectorAverage[]) {
      sectorAvgsRecord[avg.metric_name] = avg.avg_value;
      sectorMinsRecord[avg.metric_name] = avg.min_value;
      sectorMaxesRecord[avg.metric_name] = avg.max_value;
    }

    // Prospect score
    const metricsRecord: Record<string, number | null> = {};
    for (const [name, m] of metricsByName) metricsRecord[name] = m.metric_value;

    const tsForScoring: Record<string, { fiscal_year: number; value: number }[]> = {};
    for (const d of annualData) {
      if (!tsForScoring[d.metric_name]) tsForScoring[d.metric_name] = [];
      tsForScoring[d.metric_name].push({ fiscal_year: d.fiscal_year, value: d.metric_value });
    }

    prospectScoreResult = computeProspectScore({
      companyId: company.id,
      ticker: company.ticker,
      name: company.name,
      sector: company.sector as Sector,
      metrics: metricsRecord,
      sectorAverages: sectorAvgsRecord,
      sectorMins: sectorMinsRecord,
      sectorMaxes: sectorMaxesRecord,
      timeseries: tsForScoring,
    });

    // Founder narrative
    const tsForNarrative: Record<string, Record<number, number>> = {};
    for (const [metric, entries] of Object.entries(tsForScoring)) {
      tsForNarrative[metric] = {};
      for (const e of entries) tsForNarrative[metric][e.fiscal_year] = e.value;
    }
    const narrative = generateFounderNarrative({
      companyName: company.name,
      ticker: company.ticker,
      sector: company.sector as Sector,
      metrics: metricsRecord,
      sectorAverages: sectorAvgsRecord,
      prospectScore: prospectScoreResult,
      timeseries: tsForNarrative,
    });
    hookSentence = narrative.hookSentence;
    useCases = narrative.relevantUseCases;

    // Opportunity data
    opportunityData = computeOpportunityData(
      company.sector,
      metricsRecord,
      sectorAvgsRecord,
      sectorMinsRecord,
      sectorMaxesRecord,
    );
  } catch {
    const seed = COMPANIES_SEED.find((c) => c.ticker === decodedTicker);
    if (!seed) notFound();
    company = {
      id: "",
      cik: seed.cik,
      ticker: seed.ticker,
      name: seed.name,
      sector: seed.sector as Sector,
      sub_sector: seed.sub_sector,
      entity_name: null,
      market_cap_bucket: null,
      sic_code: seed.sic_code,
      is_active: true,
      last_ingested_at: null,
      created_at: "",
      updated_at: "",
    };
  }

  const score = prospectScoreResult?.totalScore ?? null;
  const scoreTier = score != null ? (score >= 70 ? "High" : score >= 40 ? "Mid" : "Low") : null;
  const scoreColor = score != null ? (score >= 70 ? "text-emerald-500" : score >= 40 ? "text-yellow-500" : "text-red-500") : "";
  const latestTech = techSignals.length > 0 ? techSignals[0] : null;

  return (
    <div className={cn("container px-4 py-5 md:px-6 border-t-2 space-y-4", sectorBorder[company.sector as Sector] ?? "")}>

      {/* ── HEADER BLOCK ── */}
      <div className="space-y-2">
        {/* Row 1: Identity + Score */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">
              {company.ticker}
            </h1>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {company.name}
            </span>
            <SectorBadge sector={company.sector as Sector} />
          </div>
          <div className="flex items-center gap-3">
            {score != null && (
              <div className="flex items-baseline gap-1">
                <span className={cn("text-3xl font-mono font-bold tabular-nums data-glow", scoreColor)}>
                  {score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
                <span className={cn("text-xs font-medium ml-1", scoreColor)}>
                  {scoreTier}
                </span>
              </div>
            )}
            <Link
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K&dateb=&owner=include&count=10`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              SEC Filings <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Row 2: Page descriptor */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Carrier Profile &mdash; Sales Intelligence for AI Startups
        </p>

        {/* Row 3: Inline KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kpiData.map((kpi) => {
            const trend = getTrendDirection(kpi.metricName, kpi.changePct);
            const TrendIcon = trend === "positive" ? TrendingUp : trend === "negative" ? TrendingDown : Minus;
            return (
              <div key={kpi.metricName} className="rounded-sm border bg-card px-4 py-3 card-glow terminal-surface">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {kpi.label}
                </p>
                <p className="text-lg font-semibold font-mono tabular-nums led-number data-glow mt-0.5">
                  {formatMetricValue(kpi.metricName, kpi.value)}
                </p>
                {kpi.changePct != null && (
                  <div className={cn(
                    "flex items-center gap-0.5 text-[11px] font-medium mt-0.5",
                    trend === "positive" && "text-positive",
                    trend === "negative" && "text-negative",
                    trend === "neutral" && "text-muted-foreground",
                  )}>
                    <TrendIcon className="h-3 w-3" />
                    <span>
                      {formatChangePct(kpi.changePct)} YoY
                      {kpi.rank != null && kpi.total != null && ` · #${kpi.rank}/${kpi.total}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Row 4: Insight callout + use-case pills */}
        {(hookSentence || useCases.length > 0) && (
          <div className="rounded-sm border-l-2 border-primary/40 bg-muted/50 px-4 py-2.5">
            {hookSentence && (
              <p className="text-xs leading-relaxed text-foreground/80">
                {hookSentence}
              </p>
            )}
            {useCases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {useCases.map((uc) => (
                  <Link key={uc.id} href={`/intel?useCase=${uc.id}`}>
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
        )}
      </div>

      {/* ── THE STORY: 2 cards ── */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Card A: Where's the Pain? */}
        <Card className="rounded-sm terminal-surface">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm">Where&apos;s the Pain?</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {PAIN_CHART_SUBTITLE[company.sector] ?? "Key pain metric trend."}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-3" style={{ height: 196 }}>
            <PainChart
              timeseries={timeseries}
              sector={company.sector}
              sectorAvgCombinedRatio={sectorAvgsRecord["combined_ratio"] ?? null}
              sectorAvgMLR={sectorAvgsRecord["medical_loss_ratio"] ?? null}
              sectorAvgROE={sectorAvgsRecord["roe"] ?? null}
            />
          </CardContent>
        </Card>

        {/* Card B: Efficiency vs. Peers */}
        <OpportunityPanel
          painMetricName={opportunityData.painMetricName}
          painMetricLabel={opportunityData.painMetricLabel}
          painMetricValue={opportunityData.painMetricValue}
          sectorAvgPainMetric={opportunityData.sectorAvgPainMetric}
          sectorBestPainMetric={opportunityData.sectorBestPainMetric}
          automationSavings={opportunityData.automationSavings}
        />
      </div>

      {/* ── PROSPECT SCORE BREAKDOWN ── */}
      {prospectScoreResult && (
        <ProspectScoreCard prospectScore={prospectScoreResult} />
      )}

      {/* ── SIGNALS ROW ── */}
      <SignalsRow techSignal={latestTech} />
    </div>
  );
}
