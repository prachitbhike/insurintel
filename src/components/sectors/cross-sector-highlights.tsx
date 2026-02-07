import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SectorOverview } from "@/lib/queries/sectors";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { SECTORS } from "@/lib/data/sectors";
import { cn } from "@/lib/utils";

interface CrossSectorHighlightsProps {
  sectorOverviews: SectorOverview[];
}

const SECTOR_COLORS: Record<string, string> = {
  "P&C": "text-blue-600 dark:text-blue-400",
  Life: "text-emerald-600 dark:text-emerald-400",
  Health: "text-violet-600 dark:text-violet-400",
  Reinsurance: "text-amber-600 dark:text-amber-400",
  Brokers: "text-rose-600 dark:text-rose-400",
};

const SECTOR_BG: Record<string, string> = {
  "P&C": "bg-blue-500/10",
  Life: "bg-emerald-500/10",
  Health: "bg-violet-500/10",
  Reinsurance: "bg-amber-500/10",
  Brokers: "bg-rose-500/10",
};

export function CrossSectorHighlights({
  sectorOverviews,
}: CrossSectorHighlightsProps) {
  if (sectorOverviews.length === 0) return null;

  // Gather ROE across all sectors
  const roeByName: { sector: string; label: string; roe: number }[] = [];
  const totalCompanies = sectorOverviews.reduce((s, o) => s + o.companyCount, 0);

  for (const overview of sectorOverviews) {
    const roe = overview.averages.roe;
    const sectorInfo = SECTORS.find((s) => s.name === overview.sector);
    if (roe != null && sectorInfo) {
      roeByName.push({ sector: overview.sector, label: sectorInfo.label, roe });
    }
  }

  roeByName.sort((a, b) => b.roe - a.roe);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display tracking-tight">
        Cross-Sector Comparison
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total coverage */}
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Universe Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display tracking-tight">
              {totalCompanies} Companies
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {sectorOverviews.length} sectors
            </p>
          </CardContent>
        </Card>

        {/* Best ROE sector */}
        {roeByName.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Highest Avg ROE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-display tracking-tight", SECTOR_COLORS[roeByName[0].sector])}>
                {roeByName[0].label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatMetricValue("roe", roeByName[0].roe)} average return on equity
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lowest ROE sector */}
        {roeByName.length > 1 && (
          <Card className="border-border/60">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Lowest Avg ROE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-display tracking-tight", SECTOR_COLORS[roeByName[roeByName.length - 1].sector])}>
                {roeByName[roeByName.length - 1].label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatMetricValue("roe", roeByName[roeByName.length - 1].roe)} average return on equity
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ROE ranking strip */}
      {roeByName.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ROE by Sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {roeByName.map((item) => (
                <div
                  key={item.sector}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md",
                    SECTOR_BG[item.sector]
                  )}
                >
                  <span className={cn("text-sm font-medium", SECTOR_COLORS[item.sector])}>
                    {item.sector}
                  </span>
                  <span className="text-sm font-mono tabular-nums">
                    {formatMetricValue("roe", item.roe)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
