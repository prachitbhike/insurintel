import { type CompanyFacts, type XbrlUnit } from "./types";
import { XBRL_CONCEPTS } from "./concepts";
import { type ParsedMetric } from "@/types/metric";

export function parseCompanyFacts(facts: CompanyFacts): ParsedMetric[] {
  const metrics: ParsedMetric[] = [];

  for (const concept of XBRL_CONCEPTS) {
    const taxonomyFacts = facts.facts[concept.taxonomy];
    if (!taxonomyFacts) continue;

    // Merge entries from ALL matching aliases instead of first-match-wins.
    // Earlier aliases win for overlapping periods (preferred tag), but
    // later aliases fill gaps from XBRL tag transitions.
    const merged = new Map<string, XbrlUnit>();
    for (const alias of concept.aliases) {
      const conceptData = taxonomyFacts[alias];
      if (!conceptData) continue;

      const candidateUnits =
        conceptData.units[concept.unit_key] ??
        Object.values(conceptData.units)[0];

      if (!candidateUnits || candidateUnits.length === 0) continue;

      for (const u of candidateUnits) {
        if (u.form !== "10-K" && u.form !== "10-Q") continue;
        const key = `${u.form}|${u.start ?? ""}|${u.end}`;
        const existing = merged.get(key);
        // Add if new period, or replace if strictly later filing.
        // For same filing date across aliases, first alias wins (preferred).
        if (!existing || u.filed > existing.filed) {
          merged.set(key, u);
        }
      }
    }

    const deduped = Array.from(merged.values());
    if (deduped.length === 0) continue;

    for (const entry of deduped) {
      // For us-gaap: use end date year as the actual fiscal year (not entry.fy
      // which is the filing year and tags all comparative data the same).
      // For DEI: use entry.fy because DEI cover page dates (e.g., 2025-01-31)
      // don't represent the fiscal period end — they're the cover page date of
      // a 10-K that covers the prior fiscal year.
      const endYear =
        concept.taxonomy === "dei"
          ? entry.fy
          : parseInt(entry.end.substring(0, 4), 10);
      const isAnnual = entry.form === "10-K";
      const fiscalQuarter = isAnnual ? null : parseFiscalQuarter(entry.fp);

      metrics.push({
        metric_name: concept.metric_name,
        value: entry.val,
        unit: concept.unit_key === "USD" ? "USD" : concept.unit_key,
        period_type: isAnnual ? "annual" : "quarterly",
        fiscal_year: endYear,
        fiscal_quarter: fiscalQuarter,
        period_start_date: entry.start ?? null,
        period_end_date: entry.end,
        accession_number: entry.accn,
        filed_at: entry.filed,
        form: entry.form,
      });
    }
  }

  return metrics;
}

function parseFiscalQuarter(fp: string): number | null {
  switch (fp) {
    case "Q1":
      return 1;
    case "Q2":
      return 2;
    case "Q3":
      return 3;
    case "Q4":
      return 4;
    default:
      return null;
  }
}
