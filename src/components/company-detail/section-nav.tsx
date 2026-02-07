"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { type DetailSection } from "@/lib/data/company-detail-config";

interface SectionNavProps {
  sections: DetailSection[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sectionIds = sections.map((s) => s.id);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="sticky top-[57px] z-30 -mx-4 md:-mx-6 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex overflow-x-auto px-4 md:px-6 gap-0.5 no-scrollbar">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={cn(
              "shrink-0 font-mono text-[11px] uppercase tracking-wider px-3 py-2.5 border-b-2 transition-colors",
              activeId === section.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
