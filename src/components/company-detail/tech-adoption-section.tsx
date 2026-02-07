"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechAdoptionBadge } from "./tech-adoption-badge";
import { type TechAdoptionSignal } from "@/types/tech-signals";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { type ChartConfig } from "@/components/ui/chart";

interface TechAdoptionSectionProps {
  signals: TechAdoptionSignal[];
}

export function TechAdoptionSection({ signals }: TechAdoptionSectionProps) {
  if (signals.length === 0) {
    return (
      <Card className="rounded-sm terminal-surface">
        <CardHeader>
          <CardTitle className="text-sm">10-K Technology References</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No 10-K technology analysis available for this company.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = signals[0];

  // Build chart data for keyword category breakdown
  const categoryData = [
    { category: "AI", count: latest.ai_mention_count },
    { category: "ML", count: latest.ml_mention_count },
    { category: "Automation", count: latest.automation_mention_count },
    { category: "Digital", count: latest.digital_transformation_mention_count },
    { category: "Insurtech", count: latest.insurtech_mention_count },
  ].filter((d) => d.count > 0);

  const categoryConfig: ChartConfig = {
    count: {
      label: "Mentions",
      color: "var(--chart-1)",
    },
  };

  // Build density trend data
  const trendData = signals
    .slice()
    .reverse()
    .map((s) => ({
      year: String(s.fiscal_year),
      density: s.tech_density_score,
    }));

  const trendConfig: ChartConfig = {
    density: {
      label: "Tech Density",
      color: "var(--chart-2)",
    },
  };

  return (
    <Card className="rounded-sm terminal-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">10-K Technology References</CardTitle>
          <TechAdoptionBadge classification={latest.classification} />
        </div>
        <p className="text-xs text-muted-foreground">
          Keyword frequency analysis of 10-K filing text for technology-related terms
          (FY{latest.fiscal_year})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border p-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Mentions
            </p>
            <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
              {latest.total_tech_mentions}
            </p>
          </div>
          <div className="rounded-lg border p-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Density Score
            </p>
            <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
              {latest.tech_density_score.toFixed(1)}
            </p>
          </div>
          <div className="rounded-lg border p-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Mentions
            </p>
            <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
              {latest.ai_mention_count}
            </p>
          </div>
          <div className="rounded-lg border p-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Automation
            </p>
            <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
              {latest.automation_mention_count}
            </p>
          </div>
          <div className="rounded-lg border p-2.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              YoY Change
            </p>
            <p className="text-lg font-mono tabular-nums font-semibold mt-0.5">
              {latest.yoy_density_change != null
                ? `${latest.yoy_density_change > 0 ? "+" : ""}${latest.yoy_density_change.toFixed(1)}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {categoryData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Keyword Categories (FY{latest.fiscal_year})
              </p>
              <BarChartComponent
                data={categoryData}
                xKey="category"
                dataKeys={["count"]}
                config={categoryConfig}
                height={200}
              />
            </div>
          )}

          {trendData.length > 1 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Density Trend
              </p>
              <BarChartComponent
                data={trendData}
                xKey="year"
                dataKeys={["density"]}
                config={trendConfig}
                height={200}
              />
            </div>
          )}
        </div>

        {latest.keyword_snippets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Example Mentions
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {latest.keyword_snippets.slice(0, 6).map((s, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2">
                  <span className="text-xs font-medium text-primary/60 uppercase tracking-wider">
                    {s.category}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {s.context}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
