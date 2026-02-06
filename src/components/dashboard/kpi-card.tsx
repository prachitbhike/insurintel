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
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMetricValue, formatChangePct, getTrendDirection } from "@/lib/metrics/formatters";

interface KpiCardProps {
  title: string;
  metricName: string;
  value: number | null;
  changePct?: number | null;
  tooltip?: string;
  className?: string;
}

export function KpiCard({
  title,
  metricName,
  value,
  changePct,
  tooltip,
  className,
}: KpiCardProps) {
  const trend = getTrendDirection(metricName, changePct);
  const TrendIcon =
    trend === "positive"
      ? TrendingUp
      : trend === "negative"
        ? TrendingDown
        : Minus;

  const borderColor =
    trend === "positive"
      ? "border-l-positive"
      : trend === "negative"
        ? "border-l-negative"
        : "border-l-border";

  return (
    <Card className={cn("relative border-l-[3px] rounded-sm card-glow terminal-surface", borderColor, className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl led-number data-glow font-semibold tracking-tight">
          {formatMetricValue(metricName, value)}
        </div>
        {changePct != null && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-medium",
              trend === "positive" && "text-positive",
              trend === "negative" && "text-negative",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{formatChangePct(changePct)} vs prior year</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
