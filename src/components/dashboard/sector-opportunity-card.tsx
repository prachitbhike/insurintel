import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { getMetricDefinition } from "@/lib/metrics/definitions";
import { MetricLabel } from "@/components/ui/metric-label";
import Link from "next/link";
import { type Sector } from "@/types/database";
import { getSectorSlug } from "@/lib/data/sectors";
import { cn } from "@/lib/utils";

const sectorAccent: Record<Sector, { border: string; spark: string; gradient: string }> = {
  "P&C": {
    border: "border-l-blue-500",
    spark: "hsl(217 91% 60%)",
    gradient: "from-blue-500/[0.04]",
  },
  Life: {
    border: "border-l-emerald-500",
    spark: "hsl(160 84% 39%)",
    gradient: "from-emerald-500/[0.04]",
  },
  Health: {
    border: "border-l-violet-500",
    spark: "hsl(263 70% 50%)",
    gradient: "from-violet-500/[0.04]",
  },
  Reinsurance: {
    border: "border-l-amber-500",
    spark: "hsl(38 92% 50%)",
    gradient: "from-amber-500/[0.04]",
  },
  Brokers: {
    border: "border-l-rose-500",
    spark: "hsl(347 77% 50%)",
    gradient: "from-rose-500/[0.04]",
  },
};

export interface OpportunityMetricDisplay {
  name: string;
  label: string;
  value: number | null;
  delta?: number | null;
  interpretation?: string | null;
}

interface SectorOpportunityCardProps {
  sector: Sector;
  label: string;
  companyCount: number;
  metric1: OpportunityMetricDisplay;
  metric2: OpportunityMetricDisplay;
  sparklineTrend: number[];
  color: string;
}

function DeltaIndicator({ metricName, delta }: { metricName: string; delta?: number | null }) {
  if (delta == null || Math.abs(delta) < 0.01) return null;
  const def = getMetricDefinition(metricName);
  const isPercent = def?.unit === "percent";
  const sign = delta >= 0 ? "+" : "";
  const label = isPercent ? `${sign}${delta.toFixed(1)}` : `${sign}${delta.toFixed(1)}%`;
  const higherIsBetter = def?.higher_is_better ?? true;
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <span
      className={cn(
        "text-xs font-mono ml-1",
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {label}
    </span>
  );
}

export function SectorOpportunityCard({
  sector,
  label,
  companyCount,
  metric1,
  metric2,
  sparklineTrend,
}: SectorOpportunityCardProps) {
  const accent = sectorAccent[sector];

  return (
    <Link href={`/sectors/${getSectorSlug(sector)}`} className="group">
      <Card
        className={cn(
          "border-l-[3px] shadow-sm transition-all duration-200 h-full",
          "group-hover:shadow-md group-hover:border-foreground/15 group-hover:-translate-y-0.5",
          "bg-gradient-to-br to-transparent",
          accent.border,
          accent.gradient
        )}
      >
        <CardContent className="pt-4 pb-3.5 px-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {companyCount} {companyCount === 1 ? "company" : "companies"}
              </p>
            </div>
            {sparklineTrend.length > 1 && (
              <Sparkline
                data={sparklineTrend}
                color={accent.spark}
                height={36}
                width={80}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <MetricLabel metricName={metric1.name} label={metric1.label} className="text-xs" iconClassName="h-2.5 w-2.5" />
              </p>
              <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
                {formatMetricValue(metric1.name, metric1.value)}
                <DeltaIndicator metricName={metric1.name} delta={metric1.delta} />
              </p>
              {metric1.interpretation && (
                <p className="text-[10px] leading-snug text-muted-foreground mt-0.5">
                  {metric1.interpretation}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <MetricLabel metricName={metric2.name} label={metric2.label} className="text-xs" iconClassName="h-2.5 w-2.5" />
              </p>
              <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
                {formatMetricValue(metric2.name, metric2.value)}
                <DeltaIndicator metricName={metric2.name} delta={metric2.delta} />
              </p>
              {metric2.interpretation && (
                <p className="text-[10px] leading-snug text-muted-foreground mt-0.5">
                  {metric2.interpretation}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
