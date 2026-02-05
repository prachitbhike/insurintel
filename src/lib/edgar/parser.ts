import { type CompanyFacts, type XbrlUnit } from "./types";
import { XBRL_CONCEPTS } from "./concepts";
import { type ParsedMetric } from "@/types/metric";

export function parseCompanyFacts(facts: CompanyFacts): ParsedMetric[] {
  const metrics: ParsedMetric[] = [];

  for (const concept of XBRL_CONCEPTS) {
    const taxonomyFacts = facts.facts[concept.taxonomy];
    if (!taxonomyFacts) continue;

    let units: XbrlUnit[] | undefined;

    for (const alias of concept.aliases) {
      const conceptData = taxonomyFacts[alias];
      if (!conceptData) continue;

      // Try the expected unit key first, then fall back to any available
      units =
        conceptData.units[concept.unit_key] ??
        Object.values(conceptData.units)[0];

      if (units && units.length > 0) break;
    }

    if (!units || units.length === 0) continue;

    // Filter to 10-K (annual) and 10-Q (quarterly) filings
    const annualEntries = units.filter(
      (u) => u.form === "10-K" && u.start != null
    );
    const quarterlyEntries = units.filter(
      (u) => u.form === "10-Q" && u.start != null
    );

    // Also include point-in-time (balance sheet) items from 10-K/10-Q
    const annualPointInTime = units.filter(
      (u) => u.form === "10-K" && u.start == null
    );
    const quarterlyPointInTime = units.filter(
      (u) => u.form === "10-Q" && u.start == null
    );

    // Deduplicate: prefer latest filed date per (fy, fp)
    const deduped = deduplicateEntries([
      ...annualEntries,
      ...annualPointInTime,
      ...quarterlyEntries,
      ...quarterlyPointInTime,
    ]);

    for (const entry of deduped) {
      const isAnnual = entry.form === "10-K";
      const fiscalQuarter = isAnnual ? null : parseFiscalQuarter(entry.fp);

      metrics.push({
        metric_name: concept.metric_name,
        value: entry.val,
        unit: concept.unit_key === "USD" ? "USD" : concept.unit_key,
        period_type: isAnnual ? "annual" : "quarterly",
        fiscal_year: entry.fy,
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

function deduplicateEntries(entries: XbrlUnit[]): XbrlUnit[] {
  const map = new Map<string, XbrlUnit>();

  for (const entry of entries) {
    const key = `${entry.fy}|${entry.fp}|${entry.form}|${entry.start ?? ""}|${entry.end}`;
    const existing = map.get(key);

    if (!existing || entry.filed > existing.filed) {
      map.set(key, entry);
    }
  }

  return Array.from(map.values());
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
