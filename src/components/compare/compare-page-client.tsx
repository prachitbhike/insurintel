"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { CompanyPicker } from "./company-picker";
import { ComparisonTable } from "./comparison-table";
import { ComparisonChart } from "./comparison-chart";
import { SuggestedComparisons } from "./suggested-comparisons";
import { type ComparisonData } from "@/lib/queries/compare";
import { type ComparisonPreset } from "@/lib/queries/presets";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";

interface ComparePageClientProps {
  allCompanies: { ticker: string; name: string; sector: string }[];
  initialData: ComparisonData | null;
  initialTickers: string[];
  dynamicPresets?: ComparisonPreset[];
}

const COMPARISON_METRICS = [
  "combined_ratio",
  "loss_ratio",
  "expense_ratio",
  "medical_loss_ratio",
  "roe",
  "roa",
  "eps",
  "net_income",
  "net_premiums_earned",
  "revenue",
  "total_assets",
  "book_value_per_share",
  "debt_to_equity",
  "investment_income",
];

export function ComparePageClient({
  allCompanies,
  initialData,
  initialTickers,
  dynamicPresets,
}: ComparePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>(initialTickers);
  const [data, setData] = useState<ComparisonData | null>(initialData);
  const [chartMetric, setChartMetric] = useState("roe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/compare?companies=${selected.join(",")}`
        );
        if (!res.ok) {
          if (!cancelled) setError("Failed to load comparison data. Please try again.");
          return;
        }
        if (!cancelled) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        if (!cancelled) setError("Network error. Please check your connection and try again.");
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
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Loading comparison data...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && data && data.companies.length > 0 && (
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

      {!loading && !error && selected.length === 0 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              Select companies above to compare their financial metrics side by side.
            </p>
          </div>
          <SuggestedComparisons dynamicPresets={dynamicPresets} />
        </div>
      )}
    </div>
  );
}
