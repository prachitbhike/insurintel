"use client";

import { type ProspectScoreResult } from "@/lib/scoring/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreBreakdownProps {
  score: ProspectScoreResult;
}

const SEGMENTS = [
  {
    key: "painIntensity" as const,
    label: "Pain",
    color: "bg-rose-500",
    tooltip: "How far above sector average on key pain metrics",
    weight: 40,
  },
  {
    key: "urgency" as const,
    label: "Urgency",
    color: "bg-yellow-500",
    tooltip: "Worsening trend (3yr slope of pain metric + ROE)",
    weight: 25,
  },
  {
    key: "abilityToPay" as const,
    label: "Budget",
    color: "bg-sky-500",
    tooltip: "Revenue / premiums as budget proxy",
    weight: 20,
  },
  {
    key: "scaleFit" as const,
    label: "Scale Fit",
    color: "bg-violet-500",
    tooltip: "Gaussian score favoring mid-range revenue companies",
    weight: 15,
  },
];

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const segments = SEGMENTS.filter((s) => score[s.key] != null);
  if (segments.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-sm overflow-hidden bg-secondary">
        {segments.map((seg) => {
          const value = score[seg.key] ?? 0;
          const width = (value / 100) * seg.weight;
          return (
            <Tooltip key={seg.key}>
              <TooltipTrigger asChild>
                <div
                  className={`${seg.color} transition-all duration-300`}
                  style={{ width: `${width}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">
                  {seg.label}: {score[seg.key]}/100
                </p>
                <p className="text-xs text-muted-foreground">{seg.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${seg.color}`} />
            <span>
              {seg.label} {score[seg.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
