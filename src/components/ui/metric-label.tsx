import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { cn } from "@/lib/utils";

interface MetricLabelProps {
  metricName: string;
  label?: string;
  description?: string;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

export function MetricLabel({
  metricName,
  label,
  description,
  className,
  iconClassName,
  showIcon = true,
}: MetricLabelProps) {
  const def = METRIC_DEFINITIONS[metricName];
  const displayLabel = label ?? def?.label ?? metricName.replace(/_/g, " ");
  const displayDescription = description ?? def?.description;

  if (!displayDescription || !showIcon) {
    return <span className={className}>{displayLabel}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {displayLabel}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info
            className={cn(
              "h-3 w-3 text-muted-foreground/50 cursor-help shrink-0",
              iconClassName
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{displayDescription}</p>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
