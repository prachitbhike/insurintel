"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CompanyPicker } from "./company-picker";
import { ComparisonTable } from "./comparison-table";
import { ComparisonChart } from "./comparison-chart";
import { type ComparisonData } from "@/lib/queries/compare";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

interface ComparePageClientProps {
  allCompanies: { ticker: string; name: string; sector: string }[];
  initialData: ComparisonData | null;
  initialTickers: string[];
}

const COMPARISON_METRICS = [
  "combined_ratio",
  "loss_ratio",
  "expense_ratio",
  "roe",
  "roa",
  "eps",
  "net_income",
  "net_premiums_earned",
  "total_assets",
  "book_value_per_share",
  "debt_to_equity",
  "revenue",
];

export function ComparePageClient({
  allCompanies,
  initialData,
  initialTickers,
}: ComparePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>(initialTickers);
  const [data, setData] = useState<ComparisonData | null>(initialData);
  const [chartMetric, setChartMetric] = useState("roe");
  const [loading, setLoading] = useState(false);

  const updateUrl = useCallback(
    (tickers: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tickers.length > 0) {
        params.set("companies", tickers.join(","));
      } else {
        params.delete("companies");
      }
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSelectionChange = useCallback(
    (tickers: string[]) => {
      setSelected(tickers);
      updateUrl(tickers);
    },
    [updateUrl]
  );

  useEffect(() => {
    if (selected.length === 0) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Fetch comparison data via API
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/compare?companies=${selected.join(",")}`
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const availableMetrics = COMPARISON_METRICS.filter(
    (m) => data?.metrics[m] && Object.keys(data.metrics[m]).length > 0
  );

  return (
    <div className="space-y-6">
      <CompanyPicker
        companies={allCompanies}
        selected={selected}
        onChange={handleSelectionChange}
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Loading comparison data...</p>
      )}

      {data && data.companies.length > 0 && (
        <>
          <ComparisonTable
            companies={data.companies}
            metrics={data.metrics}
          />

          <ComparisonChart
            companies={data.companies}
            timeseries={data.timeseries}
            availableMetrics={
              availableMetrics.length > 0
                ? availableMetrics
                : Object.keys(METRIC_DEFINITIONS).slice(0, 5)
            }
            selectedMetric={chartMetric}
            onMetricChange={setChartMetric}
          />
        </>
      )}

      {!loading && selected.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Select companies above to compare their financial metrics side by side.
          </p>
        </div>
      )}
    </div>
  );
}
