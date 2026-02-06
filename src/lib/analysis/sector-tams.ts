import { type Sector } from "@/types/database";
import { type BulkScoringData } from "@/lib/scoring/types";

export interface SectorTAM {
  sector: Sector;
  label: string;
  tam: number;
  description: string;
  color: string;
}

const SECTOR_COLORS: Record<Sector, string> = {
  "P&C": "blue",
  Life: "emerald",
  Health: "violet",
  Reinsurance: "amber",
  Brokers: "rose",
};

export function computeSectorTAMs(data: BulkScoringData): SectorTAM[] {
  const result: SectorTAM[] = [];

  // Group companies by sector
  const bySector = new Map<Sector, typeof data.companies>();
  for (const c of data.companies) {
    if (!bySector.has(c.sector)) bySector.set(c.sector, []);
    bySector.get(c.sector)!.push(c);
  }

  // P&C: sum((company_expense_ratio - sector_best) / 100 * net_premiums_earned)
  const pcCompanies = bySector.get("P&C") ?? [];
  const pcBestER = pcCompanies.reduce((best, c) => {
    const er = data.latestMetrics[c.id]?.expense_ratio;
    return er != null && (best == null || er < best) ? er : best;
  }, null as number | null);
  let pcTam = 0;
  for (const c of pcCompanies) {
    const er = data.latestMetrics[c.id]?.expense_ratio;
    const npe = data.latestMetrics[c.id]?.net_premiums_earned;
    if (er != null && npe != null && pcBestER != null && er > pcBestER) {
      pcTam += ((er - pcBestER) / 100) * npe;
    }
  }
  result.push({
    sector: "P&C",
    label: "Property & Casualty",
    tam: pcTam,
    description: "Expense gap vs best-in-class",
    color: SECTOR_COLORS["P&C"],
  });

  // Health: sum((1 - medical_loss_ratio/100) * (net_premiums_earned || revenue))
  const healthCompanies = bySector.get("Health") ?? [];
  let healthTam = 0;
  for (const c of healthCompanies) {
    const mlr = data.latestMetrics[c.id]?.medical_loss_ratio;
    const npe = data.latestMetrics[c.id]?.net_premiums_earned;
    const rev = data.latestMetrics[c.id]?.revenue;
    const base = npe ?? rev;
    if (mlr != null && base != null) {
      healthTam += (1 - mlr / 100) * base;
    }
  }
  result.push({
    sector: "Health",
    label: "Health Insurance",
    tam: healthTam,
    description: "Admin margin pool (1 - MLR)",
    color: SECTOR_COLORS.Health,
  });

  // Reinsurance: sum((company_expense_ratio - sector_best) / 100 * net_premiums_earned)
  const reCompanies = bySector.get("Reinsurance") ?? [];
  const reBestER = reCompanies.reduce((best, c) => {
    const er = data.latestMetrics[c.id]?.expense_ratio;
    return er != null && (best == null || er < best) ? er : best;
  }, null as number | null);
  let reTam = 0;
  for (const c of reCompanies) {
    const er = data.latestMetrics[c.id]?.expense_ratio;
    const npe = data.latestMetrics[c.id]?.net_premiums_earned;
    if (er != null && npe != null && reBestER != null && er > reBestER) {
      reTam += ((er - reBestER) / 100) * npe;
    }
  }
  result.push({
    sector: "Reinsurance",
    label: "Reinsurance",
    tam: reTam,
    description: "Expense gap vs best-in-class",
    color: SECTOR_COLORS.Reinsurance,
  });

  // Life: sum((sector_avg_roe - company_roe) / 100 * net_income / (company_roe/100))
  // for companies below avg ROE — approximates incremental income from closing efficiency gap
  const lifeCompanies = bySector.get("Life") ?? [];
  const lifeAvgROE = data.sectorAverages.Life?.roe?.avg ?? null;
  let lifeTam = 0;
  for (const c of lifeCompanies) {
    const roe = data.latestMetrics[c.id]?.roe;
    const ni = data.latestMetrics[c.id]?.net_income;
    if (roe != null && ni != null && lifeAvgROE != null && roe < lifeAvgROE && roe > 0) {
      // Equity ≈ ni / (roe/100); incremental income = (avg_roe - roe)/100 * equity
      const equity = ni / (roe / 100);
      lifeTam += ((lifeAvgROE - roe) / 100) * equity;
    }
  }
  result.push({
    sector: "Life",
    label: "Life Insurance",
    tam: lifeTam,
    description: "ROE efficiency gap vs leaders",
    color: SECTOR_COLORS.Life,
  });

  // Brokers: ROE gap — same approach as Life. For companies below sector avg ROE,
  // compute the incremental income if they closed the gap to avg.
  const brokerCompanies = bySector.get("Brokers") ?? [];
  const brokerAvgROE = data.sectorAverages.Brokers?.roe?.avg ?? null;
  let brokerTam = 0;
  for (const c of brokerCompanies) {
    const roe = data.latestMetrics[c.id]?.roe;
    const ni = data.latestMetrics[c.id]?.net_income;
    if (roe != null && ni != null && brokerAvgROE != null && roe < brokerAvgROE && roe > 0) {
      const equity = ni / (roe / 100);
      brokerTam += ((brokerAvgROE - roe) / 100) * equity;
    }
  }
  result.push({
    sector: "Brokers",
    label: "Insurance Brokers",
    tam: brokerTam,
    description: "ROE gap vs sector average",
    color: SECTOR_COLORS.Brokers,
  });

  return result;
}
