"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FilingRecord, estimateNextFiling } from "@/lib/queries/filings";
import { Badge } from "@/components/ui/badge";

interface FilingCalendarProps {
  filings: FilingRecord[];
}

export function FilingCalendar({ filings }: FilingCalendarProps) {
  const upcomingFilings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    // Get latest filing per company
    const latestByCompany = new Map<string, FilingRecord>();
    for (const f of filings) {
      if (!latestByCompany.has(f.ticker) && f.filedAt) {
        latestByCompany.set(f.ticker, f);
      }
    }

    // Estimate next filing
    const upcoming: { ticker: string; name: string; sector: string; expectedDate: string; lastFiled: string }[] = [];
    for (const [, f] of latestByCompany) {
      if (!f.filedAt) continue;
      const expected = estimateNextFiling(f.filedAt);
      upcoming.push({
        ticker: f.ticker,
        name: f.name,
        sector: f.sector,
        expectedDate: expected,
        lastFiled: f.filedAt,
      });
    }

    return upcoming
      .filter((u) => u.expectedDate >= today)
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [filings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Expected Filings</CardTitle>
        <p className="text-xs text-muted-foreground">
          Estimated based on last filing date + 1 year. Actual dates may vary.
        </p>
      </CardHeader>
      <CardContent>
        {upcomingFilings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming filings estimated.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {upcomingFilings.slice(0, 20).map((f) => (
              <div
                key={f.ticker}
                className="flex items-center justify-between rounded-md border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{f.ticker}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{f.name}</span>
                  <Badge variant="outline" className="text-[10px]">{f.sector}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{f.expectedDate}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Last: {f.lastFiled}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
