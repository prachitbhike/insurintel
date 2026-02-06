import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatMetricValue, formatCurrency } from "@/lib/metrics/formatters";

interface HeroBenchmarksProps {
  totalPremium: number | null;
  avgCombinedRatio: number | null;
  avgExpenseRatio: number | null;
  trackedCompanies: number;
  totalAutomationTAM?: number | null;
}

export function HeroBenchmarks({
  totalPremium,
  avgCombinedRatio,
  avgExpenseRatio,
  trackedCompanies,
  totalAutomationTAM,
}: HeroBenchmarksProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      {/* Left — Automation TAM centerpiece */}
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.03] p-6 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Automation TAM
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-teal-500/40 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Sum of potential savings if every company matched the best-in-class expense ratio. Formula: (company expense ratio - best expense ratio) / 100 x net premiums earned.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-5xl md:text-6xl font-display tracking-tight text-teal-600 dark:text-teal-400">
          {formatCurrency(totalAutomationTAM ?? 0)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
          The total addressable savings if every tracked insurer matched the best-in-class expense ratio — the prize for automation founders.
        </p>
      </div>

      {/* Right — compact metric rows */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm divide-y divide-border/50">
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Addressable Premium
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Sum of net premiums earned across {trackedCompanies} tracked insurers — not the entire market
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-display tracking-tight mt-0.5">
            {formatMetricValue("net_premiums_earned", totalPremium)}
          </p>
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Avg Combined Ratio
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Industry average combined ratio — the efficiency bar your product needs to beat
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-display tracking-tight mt-0.5">
            {formatMetricValue("combined_ratio", avgCombinedRatio)}
          </p>
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Avg Expense Ratio
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Industry average expense ratio — where AI automation creates the biggest margin gains
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-display tracking-tight mt-0.5">
            {formatMetricValue("expense_ratio", avgExpenseRatio)}
          </p>
        </div>
      </div>
    </div>
  );
}
