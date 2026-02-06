"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTORS } from "@/lib/data/sectors";

const SHORT_LABELS: Record<string, string> = {
  "p-and-c": "P&C",
  life: "Life",
  health: "Health",
  reinsurance: "Reinsurance",
  brokers: "Brokers",
};

export function SectorToggle() {
  const searchParams = useSearchParams();
  const activeSector = searchParams.get("sector");

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        <Link
          href="/"
          scroll={false}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
            !activeSector
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All Sectors
        </Link>
        {SECTORS.map((sector) => (
          <Link
            key={sector.slug}
            href={`/?sector=${sector.slug}`}
            scroll={false}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              activeSector === sector.slug
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="sm:hidden">{SHORT_LABELS[sector.slug]}</span>
            <span className="hidden sm:inline">{sector.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
