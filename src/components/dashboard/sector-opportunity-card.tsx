import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue } from "@/lib/metrics/formatters";
import Link from "next/link";
import { type Sector } from "@/types/database";
import { getSectorSlug } from "@/lib/data/sectors";

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
  color,
}: SectorOpportunityCardProps) {
  return (
    <Link href={`/sectors/${getSectorSlug(sector)}`}>
      <Card className="transition-colors hover:border-foreground/20 h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {companyCount} {companyCount === 1 ? "company" : "companies"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Expense Ratio</p>
              <p className="text-lg font-bold tabular-nums">
                {formatMetricValue("expense_ratio", avgExpenseRatio)}
              </p>
            </div>
            <Sparkline data={expenseRatioTrend} color={color} height={28} width={72} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Premium Growth</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMetricValue("premium_growth_yoy", premiumGrowth)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
