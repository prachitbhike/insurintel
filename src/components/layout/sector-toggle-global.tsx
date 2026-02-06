"use client";

import { SECTORS } from "@/lib/data/sectors";
import { useSectorFilter } from "@/lib/hooks/use-sector-filter";
import { cn } from "@/lib/utils";

const SECTOR_DOT_COLORS: Record<string, string> = {
  "P&C": "bg-blue-500",
  Life: "bg-emerald-500",
  Health: "bg-violet-500",
  Reinsurance: "bg-amber-500",
  Brokers: "bg-rose-500",
};

const SECTOR_SHORT_LABELS: Record<string, string> = {
  "P&C": "P&C",
  Life: "Life",
  Health: "Health",
  Reinsurance: "Re",
  Brokers: "Brokers",
};

export function SectorToggleGlobal({ className }: { className?: string }) {
  const { sectorSlug, setSector } = useSectorFilter();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm bg-secondary border border-border/40 p-0.5",
        className
      )}
    >
      {SECTORS.map((sector) => (
        <button
          key={sector.slug}
          onClick={() => setSector(sector.slug)}
          className={cn(
            "rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1",
            sectorSlug === sector.slug
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              SECTOR_DOT_COLORS[sector.name]
            )}
          />
          {SECTOR_SHORT_LABELS[sector.name]}
        </button>
      ))}
    </div>
  );
}
