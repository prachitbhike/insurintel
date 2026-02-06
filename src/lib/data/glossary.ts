export interface GlossaryEntry {
  term: string;
  slug: string;
  category: "metrics" | "concepts" | "business-model" | "regulation";
  definition: string;
  why_it_matters: string;
  related_metrics?: string[];
  formula?: string;
  example?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // --- Metrics ---
  {
    term: "Combined Ratio",
    slug: "combined-ratio",
    category: "metrics",
    definition:
      "The sum of an insurer's loss ratio and expense ratio. A combined ratio below 100% indicates an underwriting profit; above 100% means the insurer is paying out more in claims and expenses than it collects in premiums.",
    why_it_matters:
      "The single most important indicator of a P&C insurer's operational efficiency. Carriers above 100% rely on investment income to stay profitable.",
    related_metrics: ["loss_ratio", "expense_ratio"],
    formula: "Loss Ratio + Expense Ratio",
    example: "A combined ratio of 97.5% means for every $100 of premiums, $97.50 goes to claims and expenses, leaving $2.50 underwriting profit.",
  },
  {
    term: "Loss Ratio",
    slug: "loss-ratio",
    category: "metrics",
    definition:
      "Claims and loss adjustment expenses divided by net premiums earned. Measures the percentage of premiums consumed by policyholder claims.",
    why_it_matters:
      "Indicates the quality of risk selection and pricing. High loss ratios suggest poor underwriting or adverse selection.",
    related_metrics: ["losses_incurred", "net_premiums_earned", "combined_ratio"],
    formula: "Losses Incurred / Net Premiums Earned × 100",
  },
  {
    term: "Expense Ratio",
    slug: "expense-ratio",
    category: "metrics",
    definition:
      "Underwriting expenses (commissions, admin, technology) divided by net premiums earned. Measures operational cost efficiency.",
    why_it_matters:
      "Unlike loss ratio (driven by external events), expense ratio is largely within management's control. Wide variation across peers indicates differing levels of operational efficiency.",
    related_metrics: ["underwriting_expenses", "net_premiums_earned", "combined_ratio"],
    formula: "Underwriting Expenses / Net Premiums Earned × 100",
  },
  {
    term: "Medical Loss Ratio (MLR)",
    slug: "medical-loss-ratio",
    category: "metrics",
    definition:
      "Percentage of premium revenue that a health insurer spends on medical claims and quality improvement. The ACA mandates minimum MLR of 80% (individual/small group) and 85% (large group).",
    why_it_matters:
      "MLR is regulated — health insurers can only keep 15-20% of premiums for admin + profit. This creates a hard ceiling on administrative margins.",
    related_metrics: ["medical_claims_expense", "revenue"],
    formula: "Medical Claims Expense / Net Premiums Earned × 100",
  },
  {
    term: "Return on Equity (ROE)",
    slug: "roe",
    category: "metrics",
    definition:
      "Net income divided by stockholders' equity. Measures how efficiently a company generates profit from shareholder capital.",
    why_it_matters:
      "Insurance ROE typically ranges 8-15%. Companies consistently below their sector average face board and investor pressure to improve efficiency.",
    related_metrics: ["net_income", "stockholders_equity"],
    formula: "Net Income / Stockholders' Equity × 100",
  },
  {
    term: "Net Premiums Earned",
    slug: "net-premiums-earned",
    category: "metrics",
    definition:
      "The portion of written premiums that has been earned (recognized as revenue) during the period, net of reinsurance cessions.",
    why_it_matters:
      "The primary revenue metric for P&C, life, and reinsurance companies. Indicates company scale and market position.",
    related_metrics: ["premium_growth_yoy", "losses_incurred"],
  },
  {
    term: "Debt-to-Equity Ratio",
    slug: "debt-to-equity",
    category: "metrics",
    definition:
      "Total debt divided by stockholders' equity. Measures financial leverage — how much of the company is funded by debt vs. equity.",
    why_it_matters:
      "Highly leveraged insurers may face constraints on investment. Moderate leverage (0.3-0.6) is typical; above 1.0 suggests significant financial pressure.",
    related_metrics: ["total_debt", "stockholders_equity"],
    formula: "Total Debt / Stockholders' Equity",
  },
  // --- Concepts ---
  {
    term: "Underwriting Cycle",
    slug: "underwriting-cycle",
    category: "concepts",
    definition:
      "The cyclical pattern of P&C insurance market conditions alternating between 'hard' markets (high prices, strict underwriting) and 'soft' markets (low prices, loose underwriting). Cycles typically last 5-10 years.",
    why_it_matters:
      "During hard markets, insurers are profitable and may invest in technology. During soft markets, competition intensifies and cost pressure increases.",
  },
  {
    term: "Float",
    slug: "float",
    category: "concepts",
    definition:
      "The money an insurer holds between collecting premiums and paying claims. This 'float' is invested, generating investment income that can offset underwriting losses.",
    why_it_matters:
      "Float is why insurers can operate at combined ratios above 100%. A company with $50B in float earning 4% generates $2B in investment income annually.",
    example: "Berkshire Hathaway holds ~$170B in float, generating substantial investment returns that subsidize its insurance operations.",
  },
  {
    term: "Reinsurance",
    slug: "reinsurance",
    category: "concepts",
    definition:
      "Insurance for insurance companies. Primary carriers transfer portions of their risk to reinsurers in exchange for premiums. This protects carriers from catastrophic losses.",
    why_it_matters:
      "Reinsurance is the backbone of the global insurance system. Rising reinsurance costs are passed through to consumers and affect the entire value chain.",
  },
  {
    term: "Actuarial Reserving",
    slug: "actuarial-reserving",
    category: "concepts",
    definition:
      "The process of estimating the total cost of future claim payments for policies already written. Reserves appear as liabilities on the balance sheet and directly affect reported profitability.",
    why_it_matters:
      "Reserve accuracy is critical. Under-reserving inflates current profits but creates future losses. Over-reserving depresses current results but provides cushion.",
  },
  {
    term: "Cat Modeling",
    slug: "cat-modeling",
    category: "concepts",
    definition:
      "Catastrophe modeling: using statistical and simulation techniques to estimate potential losses from natural disasters (hurricanes, earthquakes) and man-made events.",
    why_it_matters:
      "Cat models drive pricing, capital allocation, and reinsurance purchasing decisions. Better models lead to better risk selection and pricing.",
  },
  // --- Business Models ---
  {
    term: "Carrier",
    slug: "carrier",
    category: "business-model",
    definition:
      "An insurance company that underwrites risk — it issues policies, collects premiums, and pays claims. Carriers bear the financial risk of the policies they write.",
    why_it_matters:
      "Carriers are the core of the insurance value chain. Their financial health (combined ratio, ROE) determines market stability.",
  },
  {
    term: "Broker / Intermediary",
    slug: "broker",
    category: "business-model",
    definition:
      "A company that distributes insurance products on behalf of carriers. Brokers advise clients, negotiate coverage, and earn commissions. Major brokers (MMC, AON, WTW) also provide risk consulting and reinsurance broking.",
    why_it_matters:
      "Brokers control distribution and client relationships. The top 3 brokers place a significant percentage of commercial insurance globally.",
    example: "Marsh McLennan (MMC) is the world's largest insurance broker with $23B+ in revenue.",
  },
  {
    term: "MGA / MGU",
    slug: "mga",
    category: "business-model",
    definition:
      "Managing General Agent / Managing General Underwriter: a specialized intermediary that has been delegated underwriting authority by a carrier. MGAs price, bind, and sometimes handle claims on behalf of the carrier.",
    why_it_matters:
      "MGAs are the fastest-growing segment of the insurance market. They typically operate with delegated authority and flexible technology stacks.",
  },
  {
    term: "Reinsurer",
    slug: "reinsurer-bm",
    category: "business-model",
    definition:
      "A company that provides insurance to other insurance companies. Reinsurers absorb portions of primary carriers' risks through treaties (automatic) or facultative (individual risk) agreements.",
    why_it_matters:
      "Reinsurers set the floor for insurance pricing. When reinsurance costs rise, primary premiums follow.",
  },
  // --- Regulation ---
  {
    term: "ACA MLR Requirements",
    slug: "aca-mlr",
    category: "regulation",
    definition:
      "The Affordable Care Act mandates that health insurers spend at least 80% (individual/small group) or 85% (large group) of premium revenue on medical claims and quality improvement. Insurers failing to meet these thresholds must rebate the difference to policyholders.",
    why_it_matters:
      "MLR floors cap health insurer profit margins. Any efficiency gains must come from the 15-20% administrative allocation.",
  },
  {
    term: "Risk-Based Capital (RBC)",
    slug: "rbc",
    category: "regulation",
    definition:
      "A regulatory framework that requires insurers to maintain minimum capital levels proportional to the risks they underwrite. RBC ratios below certain thresholds trigger regulatory action.",
    why_it_matters:
      "Capital constraints limit growth. Companies with thin RBC margins are pressured to either raise capital or improve underwriting efficiency.",
  },
  {
    term: "State-Based Regulation",
    slug: "state-regulation",
    category: "regulation",
    definition:
      "In the US, insurance is primarily regulated at the state level (not federal). Each state has its own insurance department, rate approval process, and consumer protection rules. The NAIC coordinates across states.",
    why_it_matters:
      "50-state regulation creates massive compliance overhead. Rate filings, policy forms, and market conduct requirements vary by state.",
  },
  {
    term: "Surplus Lines",
    slug: "surplus-lines",
    category: "regulation",
    definition:
      "Insurance coverage placed with non-admitted carriers (not licensed in the insured's state). Surplus lines covers risks that admitted carriers won't write — emerging risks, unusual exposures, or high-risk categories.",
    why_it_matters:
      "Surplus lines is growing rapidly (now ~$100B+ market) as traditional carriers retreat from harder-to-model risks (cyber, climate).",
  },
  {
    term: "10-K Filing",
    slug: "10-k",
    category: "regulation",
    definition:
      "An annual report required by the SEC from all publicly traded companies. Contains audited financial statements, management's discussion and analysis (MD&A), risk factors, and business descriptions.",
    why_it_matters:
      "10-Ks are the authoritative source of financial data. All metrics in InsurIntel are derived from XBRL-tagged data in 10-K filings via SEC EDGAR.",
  },
  {
    term: "XBRL",
    slug: "xbrl",
    category: "regulation",
    definition:
      "eXtensible Business Reporting Language — a standardized format for electronic financial reporting. All SEC filings use XBRL tags to make financial data machine-readable.",
    why_it_matters:
      "XBRL enables automated extraction and comparison of financial data across companies. It's the technology that makes InsurIntel possible.",
  },
];

export const GLOSSARY_CATEGORIES = {
  metrics: { label: "Key Metrics", description: "Financial ratios and measurements used to evaluate insurance companies" },
  concepts: { label: "Industry Concepts", description: "Core concepts that drive insurance economics and operations" },
  "business-model": { label: "Business Models", description: "How different players in the insurance ecosystem make money" },
  regulation: { label: "Regulation", description: "Rules and frameworks that shape insurance markets" },
} as const;

export type GlossaryCategory = keyof typeof GLOSSARY_CATEGORIES;

export function getGlossaryByCategory(): Record<GlossaryCategory, GlossaryEntry[]> {
  const result: Record<GlossaryCategory, GlossaryEntry[]> = {
    metrics: [],
    concepts: [],
    "business-model": [],
    regulation: [],
  };
  for (const entry of GLOSSARY) {
    result[entry.category].push(entry);
  }
  return result;
}
