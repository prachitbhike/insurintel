import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { SECTORS, type SectorInfo } from "@/lib/data/sectors";
import { type SectorOverview } from "@/lib/queries/sectors";
import { formatMetricValue } from "@/lib/metrics/formatters";

interface SectorOverviewGridProps {
  overviews: SectorOverview[];
}

export function SectorOverviewGrid({ overviews }: SectorOverviewGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SECTORS.map((sector) => {
        const overview = overviews.find((o) => o.sector === sector.name);
        return (
          <SectorOverviewCard
            key={sector.slug}
            sector={sector}
            overview={overview}
          />
        );
      })}
    </div>
  );
}

function SectorOverviewCard({
  sector,
  overview,
}: {
  sector: SectorInfo;
  overview?: SectorOverview;
}) {
  return (
    <Link href={`/sectors/${sector.slug}`}>
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{sector.label}</CardTitle>
            <Badge variant="secondary">{overview?.companyCount ?? 0}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{sector.description}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {sector.key_metrics.slice(0, 4).map((metric) => (
              <div key={metric}>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {metric.replace(/_/g, " ")}
                </p>
                <p className="text-sm font-semibold">
                  {formatMetricValue(
                    metric,
                    overview?.averages[metric] ?? null
                  )}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
            View details <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
