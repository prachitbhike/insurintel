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
      "PremiumsEarnedNetPropertyAndCasualty", // PGR, AFG — P&C-specific tag
      "SupplementaryInsuranceInformationPremiumRevenue", // AFG — SEC Schedule 12-16
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
      "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1", // MKL 2024+ replacement
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
    // DEI taxonomy fallback for shares — covers companies that only report via dei.
    // Listed BEFORE us-gaap so that us-gaap values win in the dedup step (later entry
    // overwrites with >=).
    metric_name: "shares_outstanding",
    aliases: ["EntityCommonStockSharesOutstanding"],
    unit_key: "shares",
    taxonomy: "dei",
  },
  {
    metric_name: "shares_outstanding",
    aliases: [
      "CommonStockSharesOutstanding",
      "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
      "WeightedAverageNumberOfSharesOutstandingBasic", // PRU, PGR, HIG, CINF, etc.
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
      "DebtLongtermAndShorttermCombinedAmount", // TRV, PGR, ALL, AIG, CNA
      "DebtAndCapitalLeaseObligations", // ORI, MET, MKL, CVS, AFL
      "SeniorLongTermNotes", // ACGL
      "UnsecuredDebt", // AIZ
      "JuniorSubordinatedNotes", // WRB
      "SeniorNotes", // EG
      "SubordinatedDebt", // EG
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
      "RevenueFromContractWithCustomerIncludingAssessedTax", // MMC FY2021
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
      "LiabilityForUnpaidClaimsAndClaimsAdjustmentExpenseIncurredClaims1", // MOH 2019+
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
      "SupplementaryInsuranceInformationAmortizationOfDeferredPolicyAcquisitionCosts", // EG — SEC Schedule 12-16
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
      "SellingGeneralAndAdministrativeExpense", // TRV, AIG, ALL, HIG, CINF, AFG
      "SupplementaryInsuranceInformationOtherOperatingExpense", // RGA, CNA, ORI, AIZ, AFG — SEC Schedule 12-16
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
