import { type Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFilingRecords, groupFilingsByMonth, type FilingRecord } from "@/lib/queries/filings";
import { FilingTimeline } from "@/components/filings/filing-timeline";
import { FilingCalendar } from "@/components/filings/filing-calendar";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Filing Tracker",
  description:
    "Track when insurance companies file their 10-K annual reports and estimate upcoming filing dates.",
};

export default async function FilingsPage() {
  let filings: FilingRecord[] = [];

  try {
    const supabase = await createClient();
    filings = await getFilingRecords(supabase);
  } catch {
    // Gracefully handle
  }

  const filingsByMonth = groupFilingsByMonth(filings);

  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Filings
        </p>
        <h1 className="text-3xl font-display tracking-tight">
          Filing Tracker
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Track 10-K filing dates across all 41 insurance companies. See when
          each company last filed and estimate upcoming filing windows.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-4">
            Filing History
          </h2>
          <FilingTimeline filingsByMonth={filingsByMonth} />
        </div>
        <div>
          <FilingCalendar filings={filings} />
        </div>
      </div>
    </div>
  );
}
