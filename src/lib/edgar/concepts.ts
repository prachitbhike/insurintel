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
      "NetPremiumsWritten",
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
      "PolicyholderBenefitsAndClaimsIncurredGross",
      "BenefitsLossesAndExpenses",
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
      "LiabilitiesAndStockholdersEquity",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "eps",
    aliases: [
      "EarningsPerShareBasic",
      "EarningsPerShareDiluted",
    ],
    unit_key: "USD/shares",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "shares_outstanding",
    aliases: [
      "CommonStockSharesOutstanding",
      "EntityCommonStockSharesOutstanding",
      "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
      "WeightedAverageNumberOfDilutedSharesOutstanding",
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
      "LongTermDebtNoncurrent",
      "DebtInstrumentCarryingAmount",
      "LongTermDebtAndCapitalLeaseObligations",
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
      "PremiumsEarnedNet",
    ],
    unit_key: "USD",
    taxonomy: "us-gaap",
  },
  {
    metric_name: "medical_claims_expense",
    aliases: [
      "MedicalCostRatioBenefitsIncurred",
      "PolicyholderBenefitsAndClaimsIncurredNet",
      "BenefitsAndExpenses",
      "MedicalCostsAndBenefitsExpense",
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
      "OtherUnderwritingExpense",
      "UnderwritingExpenses",
      "OperatingExpenses",
      "GeneralAndAdministrativeExpense",
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
