import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompanyByTicker } from "@/lib/queries/companies";
import { getLatestMetrics, getMetricTimeseries, getCompanyFinancials } from "@/lib/queries/metrics";
import { getCompanyRankings } from "@/lib/queries/sectors";
import { getSectorAverages } from "@/lib/queries/sectors";
import { SectorBadge } from "@/components/dashboard/sector-badge";
import { ScoreBadge } from "@/components/scoring/score-badge";
import { CompanyBrief } from "@/components/company-detail/company-brief";
import { KpiGrid } from "@/components/company-detail/kpi-grid";
import { OpportunityPanel } from "@/components/company-detail/opportunity-panel";
import { MetricCharts } from "@/components/company-detail/metric-charts";
import { PeerComparison } from "@/components/company-detail/peer-comparison";
import { FinancialTable } from "@/components/company-detail/financial-table";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { interpretMetrics, type MetricInterpretation } from "@/lib/metrics/interpret";
import { computeProspectScore } from "@/lib/scoring/prospect-score";
import { generateFounderNarrative } from "@/lib/scoring/founder-narrative";
import { type KpiValue, type TimeseriesPoint, type PeerComparison as PeerComparisonType, type FinancialRow } from "@/types/company";
import { COMPANIES_SEED } from "@/lib/data/companies-seed";
import { type Sector, type SectorAverage } from "@/types/database";

const sectorTopBorder: Record<Sector, string> = {
  "P&C": "border-t-blue-500",
  Life: "border-t-emerald-500",
  Health: "border-t-violet-500",
  Reinsurance: "border-t-amber-500",
  Brokers: "border-t-rose-500",
};

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
    description: `Financial KPIs and metrics for ${name} (${decodedTicker}). View combined ratio, ROE, premiums, and more.`,
  };
}

function generateQuickTake(
  companyName: string,
  sector: string,
  comparisons: PeerComparisonType[],
  kpis: KpiValue[],
): string[] {
  const sentences: string[] = [];
  const validComparisons = comparisons.filter(
    (c) => c.company_value != null && c.sector_avg != null
  );

  if (validComparisons.length === 0) return sentences;

  // Score each metric by relative performance vs sector avg
  const scored = validComparisons.map((c) => {
    const def = METRIC_DEFINITIONS[c.metric_name];
    const diff = c.company_value! - c.sector_avg!;
    const absDiff = Math.abs(c.sector_avg!) > 0
      ? Math.abs(diff / c.sector_avg!) * 100
      : 0;
    const isBetter = def?.higher_is_better ? diff > 0 : diff < 0;
    return { ...c, def, absDiff, isBetter };
  });

  // Top strength
  const strengths = scored.filter((s) => s.isBetter).sort((a, b) => b.absDiff - a.absDiff);
  if (strengths.length > 0) {
    const s = strengths[0];
    const label = s.def?.label ?? s.metric_name.replace(/_/g, " ");
    sentences.push(
      `${companyName} leads its ${sector} peers with a ${label.toLowerCase()} of ${formatMetricValue(s.metric_name, s.company_value)}, vs the sector average of ${formatMetricValue(s.metric_name, s.sector_avg)}.`
    );
  }

  // Top weakness
  const weaknesses = scored.filter((s) => !s.isBetter).sort((a, b) => b.absDiff - a.absDiff);
  if (weaknesses.length > 0) {
    const w = weaknesses[0];
    const label = w.def?.label ?? w.metric_name.replace(/_/g, " ");
    const rankStr = w.rank != null && w.total != null ? `, ranking #${w.rank} of ${w.total}` : "";
    sentences.push(
      `Its ${label.toLowerCase()} of ${formatMetricValue(w.metric_name, w.company_value)} trails the sector average of ${formatMetricValue(w.metric_name, w.sector_avg)}${rankStr}.`
    );
  }

  // YoY trend from KPIs
  const kpisWithChange = kpis.filter(
    (k) => k.change_pct != null && Math.abs(k.change_pct) >= 1
  );
  if (kpisWithChange.length > 0) {
    const biggest = kpisWithChange.sort(
      (a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!)
    )[0];
    const def = METRIC_DEFINITIONS[biggest.metric_name];
    const label = def?.label ?? biggest.metric_name.replace(/_/g, " ");
    const direction = biggest.change_pct! > 0 ? "increased" : "decreased";
    sentences.push(
      `${label} has ${direction} ${Math.abs(biggest.change_pct!).toFixed(1)}% year-over-year.`
    );
  }

  return sentences;
}

/** Determine the key pain metric and compute automation savings for the Opportunity Panel */
function computeOpportunityData(
  sector: string,
  metrics: Record<string, number | null>,
  sectorAvgsRecord: Record<string, number | null>,
  sectorMinsRecord: Record<string, number | null>,
  sectorMaxesRecord: Record<string, number | null>,
) {
  // Pain metric config by sector
  const PAIN_CONFIG: Record<string, { metric: string; label: string; lowerIsBetter: boolean }> = {
    "P&C": { metric: "expense_ratio", label: "Expense Ratio", lowerIsBetter: true },
    Reinsurance: { metric: "expense_ratio", label: "Expense Ratio", lowerIsBetter: true },
    Health: { metric: "medical_loss_ratio", label: "Medical Loss Ratio", lowerIsBetter: true },
    Life: { metric: "roe", label: "Return on Equity", lowerIsBetter: false },
    Brokers: { metric: "debt_to_equity", label: "Debt-to-Equity", lowerIsBetter: true },
  };

  const config = PAIN_CONFIG[sector];
  if (!config) return { painMetricName: null, painMetricLabel: "", painMetricValue: null, sectorAvgPainMetric: null, sectorBestPainMetric: null, automationSavings: null };

  const painMetricValue = metrics[config.metric] ?? null;
  const sectorAvgPainMetric = sectorAvgsRecord[config.metric] ?? null;

  // Best = min for lower-is-better, max for higher-is-better
  const sectorBestPainMetric = config.lowerIsBetter
    ? (sectorMinsRecord[config.metric] ?? null)
    : (sectorMaxesRecord[config.metric] ?? null);

  // Compute automation savings
  let automationSavings: number | null = null;
  if (painMetricValue != null && sectorBestPainMetric != null) {
    const premiums = metrics["net_premiums_earned"] ?? metrics["revenue"] ?? null;

    if (sector === "P&C" || sector === "Reinsurance") {
      // Expense ratio gap * premiums
      const gap = painMetricValue - sectorBestPainMetric;
      if (gap > 0 && premiums != null) {
        automationSavings = (gap / 100) * premiums;
      }
    } else if (sector === "Health") {
      // Admin margin gap: (1 - MLR) gap * premiums
      const adminRatio = 1 - painMetricValue / 100;
      const bestAdminRatio = 1 - sectorBestPainMetric / 100;
      const gap = adminRatio - bestAdminRatio;
      if (gap > 0 && premiums != null) {
        automationSavings = gap * premiums;
      }
    }
    // Life and Brokers: no direct savings calculation
  }

  return {
    painMetricName: config.metric,
    painMetricLabel: config.label,
    painMetricValue,
    sectorAvgPainMetric,
    sectorBestPainMetric,
    automationSavings,
  };
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker).toUpperCase();

  let company;
  let kpis: KpiValue[] = [];
  const timeseries: Record<string, TimeseriesPoint[]> = {};
  let peerComparisons: PeerComparisonType[] = [];
  let annualFinancials: FinancialRow[] = [];
  let quarterlyFinancials: FinancialRow[] = [];
  let financialYears: string[] = [];
  let quarterlyPeriods: string[] = [];
  let founderNarrative: ReturnType<typeof generateFounderNarrative> | null = null;
  let prospectScoreResult: ReturnType<typeof computeProspectScore> | null = null;
  let rankingsForGrid: { metric_name: string; rank_in_sector: number; total_in_sector: number }[] = [];
  let opportunityData = { painMetricName: null as string | null, painMetricLabel: "", painMetricValue: null as number | null, sectorAvgPainMetric: null as number | null, sectorBestPainMetric: null as number | null, automationSavings: null as number | null };
  let metricInterpretations: Record<string, MetricInterpretation> = {};

  try {
    const supabase = await createClient();
    company = await getCompanyByTicker(supabase, decodedTicker);

    if (!company) {
      notFound();
    }

    const [latestMetrics, tsData, rankings, sectorAvgs, annualData, quarterlyData] =
      await Promise.all([
        getLatestMetrics(supabase, company.id),
        getMetricTimeseries(supabase, company.id),
        getCompanyRankings(supabase, company.id),
        getSectorAverages(supabase, company.sector),
        getCompanyFinancials(supabase, company.id, "annual"),
        getCompanyFinancials(supabase, company.id, "quarterly"),
      ]);

    // Build rankings for KPI grid
    rankingsForGrid = rankings.map((r) => ({
      metric_name: r.metric_name,
      rank_in_sector: r.rank_in_sector,
      total_in_sector: r.total_in_sector,
    }));

    // Build KPIs with prior year comparison
    const metricsByName = new Map<string, typeof latestMetrics[0]>();
    for (const m of latestMetrics) {
      metricsByName.set(m.metric_name, m);
    }

    // Get prior year data for comparison (from annual financials, not quarterly MV)
    const priorYearData = new Map<string, number>();
    for (const d of annualData) {
      const latest = metricsByName.get(d.metric_name);
      if (latest && d.fiscal_year === latest.fiscal_year - 1) {
        priorYearData.set(d.metric_name, d.metric_value);
      }
    }

    kpis = latestMetrics.map((m) => {
      const prior = priorYearData.get(m.metric_name);
      let changePct: number | null = null;
      if (prior != null && prior !== 0) {
        changePct = ((m.metric_value - prior) / Math.abs(prior)) * 100;
      }
      return {
        metric_name: m.metric_name,
        current_value: m.metric_value,
        prior_value: prior ?? null,
        change_pct: changePct,
        unit: m.unit,
        fiscal_year: m.fiscal_year,
      };
    });

    // Build timeseries grouped by metric — quarterly from MV, annual from financials
    for (const ts of tsData) {
      if (!timeseries[ts.metric_name]) timeseries[ts.metric_name] = [];
      timeseries[ts.metric_name].push({
        fiscal_year: ts.fiscal_year,
        fiscal_quarter: ts.fiscal_quarter,
        value: ts.metric_value,
      });
    }
    // Merge annual data into timeseries (MV only has quarterly)
    for (const d of annualData) {
      if (!timeseries[d.metric_name]) timeseries[d.metric_name] = [];
      timeseries[d.metric_name].push({
        fiscal_year: d.fiscal_year,
        fiscal_quarter: null,
        value: d.metric_value,
      });
    }

    // Build peer comparisons
    const sectorAvgMap = new Map(sectorAvgs.map((a) => [a.metric_name, a.avg_value]));
    const rankingMap = new Map(rankings.map((r) => [r.metric_name, r]));

    // Sector-aware peer comparison metrics
    const sectorMetricMap: Record<string, string[]> = {
      "P&C": ["combined_ratio", "loss_ratio", "expense_ratio", "roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share"],
      "Reinsurance": ["combined_ratio", "loss_ratio", "expense_ratio", "roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share"],
      "Health": ["medical_loss_ratio", "roe", "roa", "eps", "revenue", "net_income", "book_value_per_share", "debt_to_equity"],
      "Life": ["roe", "roa", "eps", "net_premiums_earned", "net_income", "book_value_per_share", "investment_income", "debt_to_equity"],
      "Brokers": ["roe", "roa", "eps", "revenue", "net_income", "book_value_per_share", "debt_to_equity"],
    };
    const comparisonMetrics = sectorMetricMap[company.sector] ?? ["roe", "roa", "eps", "net_income", "book_value_per_share"];

    peerComparisons = comparisonMetrics
      .filter((m) => metricsByName.has(m))
      .map((m) => {
        const ranking = rankingMap.get(m);
        return {
          metric_name: m,
          company_value: metricsByName.get(m)?.metric_value ?? null,
          sector_avg: sectorAvgMap.get(m) ?? null,
          rank: ranking?.rank_in_sector ?? null,
          total: ranking?.total_in_sector ?? null,
        };
      });

    // Build financial table data
    const yearSet = new Set<number>();
    for (const d of annualData) yearSet.add(d.fiscal_year);
    financialYears = [...yearSet].sort((a, b) => b - a).map(String);

    const annualMap = new Map<string, Record<string, number | null>>();
    for (const d of annualData) {
      if (!annualMap.has(d.metric_name)) annualMap.set(d.metric_name, {});
      annualMap.get(d.metric_name)![String(d.fiscal_year)] = d.metric_value;
    }
    annualFinancials = [...annualMap.entries()].map(([name, values]) => ({
      metric_name: name,
      values,
      unit: "USD",
    }));

    const qMap = new Map<string, Record<string, number | null>>();
    const qYearSet = new Set<string>();
    for (const d of quarterlyData) {
      if (!qMap.has(d.metric_name)) qMap.set(d.metric_name, {});
      const key = `${d.fiscal_year} Q${d.fiscal_quarter}`;
      qMap.get(d.metric_name)![key] = d.metric_value;
      qYearSet.add(key);
    }
    quarterlyFinancials = [...qMap.entries()].map(([name, values]) => ({
      metric_name: name,
      values,
      unit: "USD",
    }));

    // Sort quarterly periods descending (e.g. "2024 Q4", "2024 Q3", ...)
    quarterlyPeriods = [...qYearSet].sort((a, b) => {
      const [aY, aQ] = a.split(" Q").map(Number);
      const [bY, bQ] = b.split(" Q").map(Number);
      return (bY * 10 + bQ) - (aY * 10 + aQ);
    });

    // Compute prospect score + founder narrative
    const metricsRecord: Record<string, number | null> = {};
    for (const [name, m] of metricsByName) metricsRecord[name] = m.metric_value;
    const sectorAvgsRecord: Record<string, number | null> = {};
    const sectorMinsRecord: Record<string, number | null> = {};
    const sectorMaxesRecord: Record<string, number | null> = {};
    for (const avg of sectorAvgs as SectorAverage[]) {
      sectorAvgsRecord[avg.metric_name] = avg.avg_value;
      sectorMinsRecord[avg.metric_name] = avg.min_value;
      sectorMaxesRecord[avg.metric_name] = avg.max_value;
    }
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
    // Build timeseries lookup for narrative (metric → year → value)
    const tsForNarrative: Record<string, Record<number, number>> = {};
    for (const [metric, entries] of Object.entries(tsForScoring)) {
      tsForNarrative[metric] = {};
      for (const e of entries) {
        tsForNarrative[metric][e.fiscal_year] = e.value;
      }
    }
    founderNarrative = generateFounderNarrative({
      companyName: company.name,
      ticker: company.ticker,
      sector: company.sector as Sector,
      metrics: metricsRecord,
      sectorAverages: sectorAvgsRecord,
      prospectScore: prospectScoreResult,
      timeseries: tsForNarrative,
    });

    // Compute opportunity panel data
    opportunityData = computeOpportunityData(
      company.sector,
      metricsRecord,
      sectorAvgsRecord,
      sectorMinsRecord,
      sectorMaxesRecord,
    );

    // Compute metric interpretations
    const sectorAvgsForInterp: Record<string, { avg: number; min: number; max: number }> = {};
    for (const avg of sectorAvgs as SectorAverage[]) {
      sectorAvgsForInterp[avg.metric_name] = {
        avg: avg.avg_value,
        min: avg.min_value,
        max: avg.max_value,
      };
    }
    const ranksForInterp: Record<string, { rank: number; total: number }> = {};
    for (const r of rankings) {
      ranksForInterp[r.metric_name] = { rank: r.rank_in_sector, total: r.total_in_sector };
    }
    const premiumBase = metricsRecord["net_premiums_earned"] ?? metricsRecord["revenue"] ?? null;
    metricInterpretations = interpretMetrics(
      metricsRecord,
      company.sector,
      sectorAvgsForInterp,
      premiumBase,
      ranksForInterp,
    );
  } catch {
    const seed = COMPANIES_SEED.find((c) => c.ticker === decodedTicker);
    if (!seed) notFound();
    company = {
      id: "",
      cik: seed.cik,
      ticker: seed.ticker,
      name: seed.name,
      sector: seed.sector,
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

  const quickTakeSentences = generateQuickTake(
    company.name,
    company.sector,
    peerComparisons,
    kpis,
  );

  return (
    <div className={`container space-y-5 px-4 py-5 md:px-6 border-t-2 ${sectorTopBorder[company.sector as Sector] ?? ""}`}>
      {/* Header: Ticker, Name, Sector Badge, Score Badge, SEC link */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-3xl font-bold data-glow tracking-tight">
            {company.ticker}
          </h1>
          <span className="text-sm text-muted-foreground truncate">
            {company.name}
          </span>
          <SectorBadge sector={company.sector} />
          <ScoreBadge score={prospectScoreResult?.totalScore ?? null} size="md" />
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

      {/* Company Brief (merged Quick Take + Founder Insights) */}
      <div className="animate-fade-up delay-1">
        <CompanyBrief
          quickTakeSentences={quickTakeSentences}
          founderNarrative={founderNarrative}
        />
      </div>

      {/* Hero Metrics Row (4 sector-specific KPIs with rank) */}
      <div className="animate-fade-up delay-1">
        <KpiGrid kpis={kpis} sector={company.sector} rankings={rankingsForGrid} interpretations={metricInterpretations} />
      </div>

      {/* AI Opportunity Panel + Key Trends side by side on wide screens */}
      <div className="animate-fade-up delay-2 grid gap-5 xl:grid-cols-2">
        {prospectScoreResult && (
          <OpportunityPanel
            painMetricName={opportunityData.painMetricName}
            painMetricLabel={opportunityData.painMetricLabel}
            painMetricValue={opportunityData.painMetricValue}
            sectorAvgPainMetric={opportunityData.sectorAvgPainMetric}
            sectorBestPainMetric={opportunityData.sectorBestPainMetric}
            automationSavings={opportunityData.automationSavings}
            prospectScore={prospectScoreResult}
            sector={company.sector}
          />
        )}
        <MetricCharts timeseries={timeseries} sector={company.sector} />
      </div>

      {/* Peer Comparison (horizontal bar chart only) */}
      <div className="animate-fade-up delay-3">
        <PeerComparison comparisons={peerComparisons} ticker={company.ticker} />
      </div>

      {/* Financial Data (collapsed accordion) */}
      <div className="animate-fade-up delay-3">
        <FinancialTable
          annualData={annualFinancials}
          quarterlyData={quarterlyFinancials}
          years={financialYears}
          quarterlyPeriods={quarterlyPeriods}
        />
      </div>
    </div>
  );
}
