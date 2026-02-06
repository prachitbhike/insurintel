export interface XbrlConceptMapping {
  metric_name: string;
  aliases: string[];
  unit_key: string;
  taxonomy: "us-gaap" | "dei" | "ifrs-full";
}

export const XBRL_CONCEPTS: XbrlConceptMapping[] = [
  {
    metric_name: "net_premiums_earned",
    aliases: [
      "PremiumsEarnedNet",
      "NetPremiumsEarned",
      "PremiumsEarned",
      // NetPremiumsWritten removed: written ≠ earned (timing difference)
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "losses_incurred",
    aliases: [
      "PolicyholderBenefitsAndClaimsIncurredNet",
      "IncurredClaimsPropertyCasualtyAndLiability",
      "LossesAndLossAdjustmentExpense",
      // PolicyholderBenefitsAndClaimsIncurredGross removed: gross vs net mismatch
      // BenefitsLossesAndExpenses removed: includes ALL expenses, not just losses
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "net_income",
    aliases: [
      "NetIncomeLoss",
      "ProfitLoss",
      "NetIncomeLossAvailableToCommonStockholdersBasic",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "stockholders_equity",
    aliases: [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "total_assets",
    aliases: ["Assets"],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "total_liabilities",
    aliases: [
      "Liabilities",
      // LiabilitiesAndStockholdersEquity removed: equals total assets (L+E), not liabilities
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "eps",
    aliases: [
      "EarningsPerShareDiluted",
      "EarningsPerShareBasic",
    ],
    unit_key: "USD/shares",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "shares_outstanding",
    aliases: [
      "CommonStockSharesOutstanding",
      "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
      // EntityCommonStockSharesOutstanding removed: dei taxonomy, never matches us-gaap lookup
      // WeightedAverageNumberOfDilutedSharesOutstanding removed: diluted avg wrong for BVPS
    ],
    unit_key: "shares",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "investment_income",
    aliases: [
      "NetInvestmentIncome",
      "InvestmentIncomeNet",
      "InvestmentIncomeInterestAndDividend",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "total_debt",
    aliases: [
      "LongTermDebt",
      "LongTermDebtAndCapitalLeaseObligations",
      "LongTermDebtNoncurrent",
      "DebtInstrumentCarryingAmount",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "revenue",
    aliases: [
      "Revenues",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "HealthCareOrganizationRevenue",
      // PremiumsEarnedNet removed: overlaps with net_premiums_earned
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "medical_claims_expense",
    aliases: [
      "PolicyholderBenefitsAndClaimsIncurredHealthCare",
      "BenefitExpenseHealthCareOrganizations",
      "PolicyholderBenefitsAndClaimsIncurredNet",
      "HealthCareCostsBenefitExpense",
      // BenefitsAndExpenses removed: includes ALL expenses
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "acquisition_costs",
    aliases: [
      "DeferredPolicyAcquisitionCostAmortizationExpense",
      "PolicyAcquisitionCosts",
      "AmortizationOfDeferredPolicyAcquisitionCosts",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "underwriting_expenses",
    aliases: [
      "UnderwritingExpenses",
      "OtherUnderwritingExpense",
      "GeneralAndAdministrativeExpense",
      // OperatingExpenses removed: includes all operating costs, 2-5x actual UW expense
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
];

export function findConceptMapping(
  metricName: string
): XbrlConceptMapping | undefined {
  return XBRL_CONCEPTS.find((c) => c.metric_name === metricName);
}
