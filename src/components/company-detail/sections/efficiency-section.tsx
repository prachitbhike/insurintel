"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CompanyRadarChart,
  type RadarDimension,
  type RadarPeer,
} from "@/components/charts/company-radar-chart";
import { OpportunityPanel } from "@/components/company-detail/opportunity-panel";
import { PeerComparison } from "@/components/company-detail/peer-comparison";
import { type PeerComparison as PeerComparisonType } from "@/types/company";
import { type ProspectScoreResult } from "@/lib/scoring/types";

interface EfficiencySectionProps {
  ticker: string;
  sector: string;
  radarPeers: RadarPeer[];
  radarDimensions: RadarDimension[];
  peerComparisons: PeerComparisonType[];
  opportunityData: {
    painMetricName: string | null;
    painMetricLabel: string;
    painMetricValue: number | null;
    sectorAvgPainMetric: number | null;
    sectorBestPainMetric: number | null;
    automationSavings: number | null;
  };
  prospectScore: ProspectScoreResult | null;
}

export function EfficiencySection({
  ticker,
  sector,
  radarPeers,
  radarDimensions,
  peerComparisons,
  opportunityData,
  prospectScore,
}: EfficiencySectionProps) {
  const hasRadar = radarPeers.length > 1 && radarDimensions.length > 0;
  const hasOpportunity = prospectScore != null;

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Efficiency Benchmarking
      </h2>
      <div className="space-y-4">
        {/* Top row: Radar + Opportunity */}
        <div className="grid gap-4 xl:grid-cols-2">
          {hasRadar && (
            <Card className="rounded-sm terminal-surface">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">
                  Sector Profile — {ticker} vs Peers
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Normalized 0-100 across {sector} companies. Higher = better.
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <CompanyRadarChart
                  focalTicker={ticker}
                  peers={radarPeers}
                  dimensions={radarDimensions}
                />
              </CardContent>
            </Card>
          )}

          {hasOpportunity && (
            <OpportunityPanel
              painMetricName={opportunityData.painMetricName}
              painMetricLabel={opportunityData.painMetricLabel}
              painMetricValue={opportunityData.painMetricValue}
              sectorAvgPainMetric={opportunityData.sectorAvgPainMetric}
              sectorBestPainMetric={opportunityData.sectorBestPainMetric}
              automationSavings={opportunityData.automationSavings}
            />
          )}
        </div>

        {/* Bottom row: Peer Comparison Bars */}
        <PeerComparison comparisons={peerComparisons} ticker={ticker} />
      </div>
    </div>
  );
}
