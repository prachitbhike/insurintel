"use client";

import { useCallback } from "react";
import { ExportButtonGroup } from "@/components/ui/export-button-group";
import { copyTableToClipboard } from "@/lib/export/clipboard";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { METRIC_DEFINITIONS } from "@/lib/metrics/definitions";
import { type KpiValue } from "@/types/company";

interface KpiExportButtonProps {
  kpis: KpiValue[];
}

export function KpiExportButton({ kpis }: KpiExportButtonProps) {
  const handleCopy = useCallback(async () => {
    const headers = ["Metric", "Value", "Change (YoY)"];
    const rows = kpis.map((k) => {
      const def = METRIC_DEFINITIONS[k.metric_name];
      return [
        def?.label ?? k.metric_name.replace(/_/g, " "),
        formatMetricValue(k.metric_name, k.current_value),
        k.change_pct != null ? `${k.change_pct > 0 ? "+" : ""}${k.change_pct.toFixed(1)}%` : "—",
      ];
    });
    return copyTableToClipboard(headers, rows);
  }, [kpis]);

  return <ExportButtonGroup onCopy={handleCopy} />;
}
