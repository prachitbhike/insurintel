import { Badge } from "@/components/ui/badge";
import { type Sector } from "@/types/database";
import { cn } from "@/lib/utils";

const sectorColors: Record<Sector, string> = {
  "P&C": "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
  Life: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
  Health: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400 dark:border-violet-800",
  Reinsurance:
    "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800",
  Brokers:
    "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-800",
};

export function SectorBadge({
  sector,
  className,
}: {
  sector: Sector;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(sectorColors[sector], className)}
    >
      {sector}
    </Badge>
  );
}
