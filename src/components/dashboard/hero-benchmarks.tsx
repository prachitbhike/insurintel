import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatMetricValue } from "@/lib/metrics/formatters";

interface HeroBenchmarksProps {
  totalPremium: number | null;
  avgCombinedRatio: number | null;
  avgExpenseRatio: number | null;
  trackedCompanies: number;
}

const heroCards = [
  {
    key: "totalPremium" as const,
    title: "Total Addressable Premium",
    metricName: "net_premiums_earned",
    tooltipFn: (n: number) =>
      `Sum of net premiums earned across ${n} tracked insurers — not the entire market`,
  },
  {
    key: "avgCombinedRatio" as const,
    title: "Avg Combined Ratio",
    metricName: "combined_ratio",
    tooltipFn: () =>
      "Industry average combined ratio — the efficiency bar your product needs to beat",
  },
  {
    key: "avgExpenseRatio" as const,
    title: "Avg Expense Ratio",
    metricName: "expense_ratio",
    tooltipFn: () =>
      "Industry average expense ratio — where AI automation creates the biggest margin gains",
  },
];

export function HeroBenchmarks({
  totalPremium,
  avgCombinedRatio,
  avgExpenseRatio,
  trackedCompanies,
}: HeroBenchmarksProps) {
  const values = { totalPremium, avgCombinedRatio, avgExpenseRatio };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {heroCards.map((card) => (
        <Card
          key={card.key}
          className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.title}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{card.tooltipFn(trackedCompanies)}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight font-mono">
              {formatMetricValue(card.metricName, values[card.key])}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
