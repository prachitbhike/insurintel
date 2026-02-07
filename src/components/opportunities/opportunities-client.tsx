"use client";

import { useMemo } from "react";
import { ProspectTable, type ProspectRow } from "./prospect-table";
import { useSectorFilter } from "@/lib/hooks/use-sector-filter";

interface OpportunitiesClientProps {
  rows: ProspectRow[];
}

export function OpportunitiesClient({ rows }: OpportunitiesClientProps) {
  const { activeSector } = useSectorFilter();

  const filteredRows = useMemo(() => {
    if (!activeSector) return rows;
    return rows.filter((r) => r.sector === activeSector.name);
  }, [rows, activeSector]);

  return <ProspectTable rows={filteredRows} />;
}
