"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { getSectorBySlug, type SectorInfo } from "@/lib/data/sectors";

export function useSectorFilter(): {
  activeSector: SectorInfo | null;
  sectorSlug: string;
  setSector: (slug: string | null) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sectorSlug = searchParams.get("sector") ?? "p-and-c";
  const activeSector = getSectorBySlug(sectorSlug) ?? null;

  const setSector = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) {
        params.set("sector", slug);
      } else {
        params.delete("sector");
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return { activeSector, sectorSlug, setSector };
}
