"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { COMPANIES_SEED } from "@/lib/data/companies-seed";
import { SECTORS } from "@/lib/data/sectors";
import { type Sector } from "@/types/database";

const companiesBySector = SECTORS.map((sector) => ({
  ...sector,
  companies: COMPANIES_SEED.filter((c) => c.sector === sector.name),
}));

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (ticker: string) => {
      setOpen(false);
      router.push(`/companies/${ticker.toLowerCase()}`);
    },
    [router]
  );

  const sectorBadgeColor: Record<Sector, string> = {
    "P&C": "text-blue-600 dark:text-blue-400",
    Life: "text-emerald-600 dark:text-emerald-400",
    Health: "text-violet-600 dark:text-violet-400",
    Reinsurance: "text-amber-600 dark:text-amber-400",
    Brokers: "text-rose-600 dark:text-rose-400",
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Companies"
      description="Search for an insurance company by name or ticker"
    >
      <CommandInput placeholder="Search companies..." />
      <CommandList>
        <CommandEmpty>No companies found.</CommandEmpty>
        {companiesBySector.map((group) => (
          <CommandGroup key={group.slug} heading={group.label}>
            {group.companies.map((c) => (
              <CommandItem
                key={c.ticker}
                value={`${c.ticker} ${c.name}`}
                onSelect={() => handleSelect(c.ticker)}
              >
                <span className="font-mono text-xs font-semibold w-14">
                  {c.ticker}
                </span>
                <span className="text-sm truncate">{c.name}</span>
                <span
                  className={`ml-auto text-[10px] font-medium ${sectorBadgeColor[c.sector]}`}
                >
                  {c.sector}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
