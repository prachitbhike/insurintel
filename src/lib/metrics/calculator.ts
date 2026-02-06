import { type ParsedMetric } from "@/types/metric";

interface MetricMap {
  [key: string]: number | undefined;
}

export function calculateDerivedMetrics(
  rawMetrics: ParsedMetric[],
  fiscalYear: number,
  fiscalQuarter: number | null,
  periodType: "annual" | "quarterly",
  sector?: string
): ParsedMetric[] {
  const lookup: MetricMap = {};
  for (const m of rawMetrics) {
    if (
      m.fiscal_year === fiscalYear &&
      m.fiscal_quarter === fiscalQuarter &&
      m.period_type === periodType
    ) {
      lookup[m.metric_name] = m.value;
    }
  }

  const derived: ParsedMetric[] = [];
  const base = {
    period_type: periodType,
    fiscal_year: fiscalYear,
    fiscal_quarter: fiscalQuarter,
    period_start_date: null,
    period_end_date: null,
    accession_number: "derived",
    filed_at: new Date().toISOString(),
    form: "derived",
  };

  // Loss Ratio, Expense Ratio, Combined Ratio — only for P&C and Reinsurance
  const uwSectors = ["P&C", "Reinsurance"];
  if (!sector || uwSectors.includes(sector)) {
    if (lookup.losses_incurred != null && lookup.net_premiums_earned != null && lookup.net_premiums_earned !== 0) {
      derived.push({
        ...base,
        metric_name: "loss_ratio",
        value: (lookup.losses_incurred / lookup.net_premiums_earned) * 100,
        unit: "percent",
      });
    }

    const acqCosts = lookup.acquisition_costs ?? 0;
    const uwExpenses = lookup.underwriting_expenses ?? 0;
    const totalExpenses = acqCosts + uwExpenses;
    if (totalExpenses > 0 && lookup.net_premiums_earned != null && lookup.net_premiums_earned !== 0) {
      derived.push({
        ...base,
        metric_name: "expense_ratio",
        value: (totalExpenses / lookup.net_premiums_earned) * 100,
        unit: "percent",
      });
    }

    const lossRatio = derived.find((d) => d.metric_name === "loss_ratio")?.value;
    const expenseRatio = derived.find((d) => d.metric_name === "expense_ratio")?.value;
    if (lossRatio != null && expenseRatio != null) {
      derived.push({
        ...base,
        metric_name: "combined_ratio",
        value: lossRatio + expenseRatio,
        unit: "percent",
      });
    }
  }

  // ROE = Net Income / Stockholders' Equity
  if (lookup.net_income != null && lookup.stockholders_equity != null && lookup.stockholders_equity !== 0) {
    derived.push({
      ...base,
      metric_name: "roe",
      value: (lookup.net_income / lookup.stockholders_equity) * 100,
      unit: "percent",
    });
  }

  // ROA = Net Income / Total Assets
  if (lookup.net_income != null && lookup.total_assets != null && lookup.total_assets !== 0) {
    derived.push({
      ...base,
      metric_name: "roa",
      value: (lookup.net_income / lookup.total_assets) * 100,
      unit: "percent",
    });
  }

  // Book Value Per Share = Equity / Shares Outstanding
  if (lookup.stockholders_equity != null && lookup.shares_outstanding != null && lookup.shares_outstanding !== 0) {
    derived.push({
      ...base,
      metric_name: "book_value_per_share",
      value: lookup.stockholders_equity / lookup.shares_outstanding,
      unit: "per_share",
    });
  }

  // Debt-to-Equity = Total Debt / Equity
  if (lookup.total_debt != null && lookup.stockholders_equity != null && lookup.stockholders_equity !== 0) {
    derived.push({
      ...base,
      metric_name: "debt_to_equity",
      value: lookup.total_debt / lookup.stockholders_equity,
      unit: "ratio",
    });
  }

  // Medical Loss Ratio — Health only, use premiums as denominator (not total revenue
  // which includes PBM/pharmacy for diversified health companies like CI, CVS, UNH)
  if (!sector || sector === "Health") {
    const mlrDenominator = lookup.net_premiums_earned ?? lookup.revenue;
    if (lookup.medical_claims_expense != null && mlrDenominator != null && mlrDenominator !== 0) {
      derived.push({
        ...base,
        metric_name: "medical_loss_ratio",
        value: (lookup.medical_claims_expense / mlrDenominator) * 100,
        unit: "percent",
      });
    }
  }

  return derived;
}

export function calculateYoyGrowth(
  currentYearMetrics: ParsedMetric[],
  priorYearMetrics: ParsedMetric[]
): ParsedMetric[] {
  const derived: ParsedMetric[] = [];

  const current = currentYearMetrics.find(
    (m) => m.metric_name === "net_premiums_earned"
  );
  const prior = priorYearMetrics.find(
    (m) => m.metric_name === "net_premiums_earned"
  );

  if (current && prior && prior.value !== 0) {
    derived.push({
      metric_name: "premium_growth_yoy",
      value: ((current.value - prior.value) / Math.abs(prior.value)) * 100,
      unit: "percent",
      period_type: current.period_type,
      fiscal_year: current.fiscal_year,
      fiscal_quarter: current.fiscal_quarter,
      period_start_date: current.period_start_date,
      period_end_date: current.period_end_date,
      accession_number: "derived",
      filed_at: new Date().toISOString(),
      form: "derived",
    });
  }

  return derived;
}
