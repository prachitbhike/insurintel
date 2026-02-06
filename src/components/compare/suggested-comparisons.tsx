"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PresetCategory } from "./preset-category";
import { type ComparisonPreset } from "@/lib/queries/presets";

interface Matchup {
  title: string;
  description: string;
  tickers: string[];
}

const MATCHUPS: Matchup[] = [
  {
    title: "P&C Efficiency Leaders",
    description:
      "Compare the best-run P&C underwriters on combined ratio, expense efficiency, and ROE.",
    tickers: ["PGR", "CB", "WRB"],
  },
  {
    title: "Health Insurer Showdown",
    description:
      "Head-to-head on medical loss ratio, revenue scale, and profitability metrics.",
    tickers: ["UNH", "CI", "ELV"],
  },
  {
    title: "Broker Battle",
    description:
      "The top intermediaries compared on revenue growth, margins, and return on equity.",
    tickers: ["MMC", "AON", "AJG"],
  },
  {
    title: "Reinsurance Leaders",
    description:
      "How the biggest reinsurers stack up on underwriting discipline and capital efficiency.",
    tickers: ["BRK.B", "RNR", "EG"],
  },
];

interface SuggestedComparisonsProps {
  dynamicPresets?: ComparisonPreset[];
}

export function SuggestedComparisons({ dynamicPresets = [] }: SuggestedComparisonsProps) {
  // Group dynamic presets by category
  const byOpportunity = dynamicPresets.filter((p) => p.category === "By Opportunity");
  const bySize = dynamicPresets.filter((p) => p.category === "By Size");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          By Sector
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {MATCHUPS.map((m) => (
            <Link
              key={m.title}
              href={`/compare?companies=${m.tickers.join(",")}`}
              className="group"
            >
              <Card className="h-full transition-all duration-150 group-hover:shadow-md group-hover:border-foreground/15">
                <CardContent className="pt-4 pb-3.5 px-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold">{m.title}</p>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {m.description}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    {m.tickers.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {byOpportunity.length > 0 && (
        <PresetCategory category="By Opportunity" presets={byOpportunity} />
      )}

      {bySize.length > 0 && (
        <PresetCategory category="By Size" presets={bySize} />
      )}
    </div>
  );
}
