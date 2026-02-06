import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue } from "@/lib/metrics/formatters";
import Link from "next/link";
import { type Sector } from "@/types/database";
import { getSectorSlug } from "@/lib/data/sectors";
import { cn } from "@/lib/utils";

const sectorAccent: Record<Sector, { border: string; spark: string }> = {
  "P&C": {
    border: "border-l-blue-500",
    spark: "hsl(217 91% 60%)",
  },
  Life: {
    border: "border-l-emerald-500",
    spark: "hsl(160 84% 39%)",
  },
  Health: {
    border: "border-l-violet-500",
    spark: "hsl(263 70% 50%)",
  },
  Reinsurance: {
    border: "border-l-amber-500",
    spark: "hsl(38 92% 50%)",
  },
  Brokers: {
    border: "border-l-rose-500",
    spark: "hsl(347 77% 50%)",
  },
};

interface SectorOpportunityCardProps {
  sector: Sector;
  label: string;
  companyCount: number;
  avgExpenseRatio: number | null;
  premiumGrowth: number | null;
  expenseRatioTrend: number[];
  color: string;
}

export function SectorOpportunityCard({
  sector,
  label,
  companyCount,
  avgExpenseRatio,
  premiumGrowth,
  expenseRatioTrend,
}: SectorOpportunityCardProps) {
  const accent = sectorAccent[sector];

  return (
    <Link href={`/?sector=${getSectorSlug(sector)}`} scroll={false} className="group">
      <Card
        className={cn(
          "border-l-[3px] shadow-sm transition-all duration-150 h-full",
          "group-hover:shadow-md group-hover:border-foreground/15",
          accent.border
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
            {expenseRatioTrend.length > 1 && (
              <Sparkline
                data={expenseRatioTrend}
                color={accent.spark}
                height={26}
                width={64}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Expense Ratio
              </p>
              <p className="text-base font-bold tabular-nums font-mono mt-0.5">
                {formatMetricValue("expense_ratio", avgExpenseRatio)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Premium Growth
              </p>
              <p className="text-base font-bold tabular-nums font-mono mt-0.5">
                {formatMetricValue("premium_growth_yoy", premiumGrowth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
