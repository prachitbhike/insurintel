import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { getMetricDefinition } from "@/lib/metrics/definitions";

export function MetricTooltip({ metricName }: { metricName: string }) {
  const def = getMetricDefinition(metricName);
  if (!def) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="inline h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs font-medium">{def.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {def.description}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
