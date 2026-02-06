"use client";

import { Badge } from "@/components/ui/badge";
import { type FilingRecord } from "@/lib/queries/filings";
import Link from "next/link";

interface FilingTimelineProps {
  filingsByMonth: Map<string, FilingRecord[]>;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function FilingTimeline({ filingsByMonth }: FilingTimelineProps) {
  const months = [...filingsByMonth.keys()].sort().reverse();

  if (months.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No filing data available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {months.map((month) => {
        const [year, monthNum] = month.split("-").map(Number);
        const filings = filingsByMonth.get(month) ?? [];
        const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;

        return (
          <div key={month} className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <h3 className="text-sm font-semibold">{monthLabel}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {filings.length} {filings.length === 1 ? "filing" : "filings"}
              </Badge>
            </div>
            <div className="ml-5 border-l pl-4 space-y-2">
              {filings.map((f) => (
                <div
                  key={`${f.ticker}-${f.fiscalYear}`}
                  className="flex items-center justify-between rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/companies/${f.ticker.toLowerCase()}`}
                      className="font-semibold text-sm hover:underline underline-offset-2"
                    >
                      {f.ticker}
                    </Link>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {f.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      FY{f.fiscalYear}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {f.filedAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
