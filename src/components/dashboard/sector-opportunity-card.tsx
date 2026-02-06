import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue } from "@/lib/metrics/formatters";
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
              <p className="text-[13px] font-semibold leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
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
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MetricLabel metricName={metric1.name} label={metric1.label} className="text-[10px]" iconClassName="h-2.5 w-2.5" />
              </p>
              <p className="text-lg font-bold tabular-nums font-mono mt-0.5">
                {formatMetricValue(metric1.name, metric1.value)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MetricLabel metricName={metric2.name} label={metric2.label} className="text-[10px]" iconClassName="h-2.5 w-2.5" />
              </p>
              <p className="text-lg font-bold tabular-nums font-mono mt-0.5">
                {formatMetricValue(metric2.name, metric2.value)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
