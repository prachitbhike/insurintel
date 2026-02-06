import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { type SectorInfo } from "@/lib/data/sectors";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

interface SectorCardProps {
  sector: SectorInfo;
  averages: Record<string, number>;
  companyCount: number;
}

export function SectorCard({
  sector,
  averages,
  companyCount,
}: SectorCardProps) {
  const primaryMetric = sector.key_metrics[0];
  const primaryValue = averages[primaryMetric] ?? null;

  return (
    <Link href={`/?sector=${sector.slug}`} scroll={false}>
      <Card className="group transition-all hover:shadow-md hover:border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {sector.label}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {companyCount} companies
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground capitalize">
                {primaryMetric.replace(/_/g, " ")}
              </p>
              <p className="text-xl font-bold">
                {formatMetricValue(primaryMetric, primaryValue)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sector.key_metrics.slice(1, 3).map((metric) => (
                <div key={metric}>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {metric.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-medium">
                    {formatMetricValue(metric, averages[metric] ?? null)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div
            className={cn(
              "mt-3 flex items-center text-xs text-muted-foreground transition-colors group-hover:text-primary"
            )}
          >
            View sector details
            <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
