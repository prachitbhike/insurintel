import { type UseCase, USE_CASES } from "@/lib/data/use-cases";

export interface CompanyTamResult {
  companyId: string;
  ticker: string;
  name: string;
  sector: string;
  useCaseId: string;
  addressableSpend: number;
  currentMetricValue: number | null;
  targetMetricValue: number | null;
  metricName: string;
  revenueBase: number;
}

interface CompanyData {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  metrics: Record<string, number>;
}

interface SectorStats {
  [metric: string]: { min: number; max: number; avg: number };
}

export function computeCompanyTam(
  company: CompanyData,
  useCase: UseCase,
  sectorStats: SectorStats,
): CompanyTamResult | null {
  if (!useCase.applicableSectors.includes(company.sector as never)) return null;

  const premiums = company.metrics["net_premiums_earned"] ?? 0;
  const revenue = company.metrics["revenue"] ?? 0;
  const base = premiums || revenue;
  if (base <= 0) return null;

  let addressable = 0;
  let currentMetricValue: number | null = null;
  let targetMetricValue: number | null = null;
  let metricName = "";

  switch (useCase.tamFormula) {
    case "expense_based": {
      const er = company.metrics["expense_ratio"];
      const sectorMin = sectorStats["expense_ratio"]?.min;
      if (er == null || sectorMin == null) return null;
      const excess = Math.max(0, er - sectorMin);
      addressable = (excess / 100) * base;
      currentMetricValue = er;
      targetMetricValue = sectorMin;
      metricName = "expense_ratio";
      break;
    }
    case "loss_based": {
      const lr = company.metrics["loss_ratio"];
      const sectorMin = sectorStats["loss_ratio"]?.min;
      if (lr == null || sectorMin == null) return null;
      const excess = Math.max(0, lr - sectorMin);
      addressable = (excess / 100) * base;
      currentMetricValue = lr;
      targetMetricValue = sectorMin;
      metricName = "loss_ratio";
      break;
    }
    case "admin_based": {
      const mlr = company.metrics["medical_loss_ratio"];
      if (mlr == null) return null;
      const adminMargin = Math.max(0, 1 - mlr / 100);
      addressable = adminMargin * base;
      currentMetricValue = mlr;
      targetMetricValue = null;
      metricName = "medical_loss_ratio";
      break;
    }
  }

  if (addressable <= 0) return null;

  return {
    companyId: company.id,
    ticker: company.ticker,
    name: company.name,
    sector: company.sector,
    useCaseId: useCase.id,
    addressableSpend: addressable,
    currentMetricValue,
    targetMetricValue,
    metricName,
    revenueBase: base,
  };
}

export function computeBestTamPerCompany(
  company: CompanyData,
  sectorStats: SectorStats,
): { bestResult: CompanyTamResult; bestUseCase: UseCase } | null {
  let best: { bestResult: CompanyTamResult; bestUseCase: UseCase } | null = null;

  for (const useCase of USE_CASES) {
    const result = computeCompanyTam(company, useCase, sectorStats);
    if (result && (!best || result.addressableSpend > best.bestResult.addressableSpend)) {
      best = { bestResult: result, bestUseCase: useCase };
    }
  }

  return best;
}

export function computeBatchTam(
  companies: CompanyData[],
  useCase: UseCase,
  sectorStatsMap: Record<string, SectorStats>,
): CompanyTamResult[] {
  const results: CompanyTamResult[] = [];
  for (const company of companies) {
    const stats = sectorStatsMap[company.sector] ?? {};
    const result = computeCompanyTam(company, useCase, stats);
    if (result) results.push(result);
  }
  return results.sort((a, b) => b.addressableSpend - a.addressableSpend);
}
