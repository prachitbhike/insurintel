export interface GlossaryEntry {
  term: string;
  slug: string;
  category: "metrics" | "concepts" | "business-model" | "regulation";
  definition: string;
  why_it_matters: string;
  founder_angle: string;
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
    founder_angle:
      "Companies with high combined ratios (>100%) are your best prospects — they're losing money on core operations and are motivated to adopt AI solutions that reduce claims costs or streamline operations.",
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
    founder_angle:
      "AI-driven claims triage and fraud detection directly attack loss ratio. Every percentage point reduction on a large book can be worth hundreds of millions.",
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
      "Unlike loss ratio (driven by external events), expense ratio is largely within management's control. Wide variation across peers signals automation opportunities.",
    founder_angle:
      "This is the metric that proves your value proposition. If the industry average is 30% and best-in-class is 22%, the 8pp gap across the industry represents tens of billions in addressable spend.",
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
      "MLR is regulated — health insurers can only keep 15-20% of premiums for admin + profit. This creates intense pressure to automate administrative costs.",
    founder_angle:
      "The regulatory floor means health payers can't differentiate on claims reduction. Your opportunity is on the admin side: prior auth automation, member services AI, and claims processing that lets them hit MLR floors while maximizing the 15-20% they keep.",
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
    founder_angle:
      "Low ROE companies face the most pressure to adopt new technology. Declining ROE trends are an even stronger signal — these companies need your solution most urgently.",
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
    founder_angle:
      "Premium volume is your proxy for a prospect's budget. A company earning $20B in premiums has very different buying power than one earning $2B. Use it to size your TAM per company.",
    related_metrics: ["premium_growth_yoy", "losses_incurred"],
  },
  {
    term: "Debt-to-Equity Ratio",
    slug: "debt-to-equity",
    category: "metrics",
    definition:
      "Total debt divided by stockholders' equity. Measures financial leverage — how much of the company is funded by debt vs. equity.",
    why_it_matters:
      "Highly leveraged insurers may face constraints on technology investment. Moderate leverage (0.3-0.6) is typical; above 1.0 suggests significant financial pressure.",
    founder_angle:
      "High D/E companies may be motivated buyers (efficiency pressure) but harder closes (budget constraints). Sweet spot: moderate leverage + high combined ratio.",
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
      "During hard markets, insurers are profitable and may invest in technology. During soft markets, competition intensifies and cost pressure drives automation adoption.",
    founder_angle:
      "Soft markets are your best selling environment — insurers need to cut costs to maintain margins. Hard markets may slow sales cycles but create budget for investment.",
  },
  {
    term: "Float",
    slug: "float",
    category: "concepts",
    definition:
      "The money an insurer holds between collecting premiums and paying claims. This 'float' is invested, generating investment income that can offset underwriting losses.",
    why_it_matters:
      "Float is why insurers can operate at combined ratios above 100%. A company with $50B in float earning 4% generates $2B in investment income annually.",
    founder_angle:
      "Float-rich companies (large, long-tail carriers) can tolerate higher combined ratios. They may be less urgent AI buyers. Focus on companies where investment income doesn't cover underwriting losses.",
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
    founder_angle:
      "Reinsurers deal with massive datasets (catastrophe modeling, treaty pricing) and have sophisticated technical teams. They're often early technology adopters but have long sales cycles.",
  },
  {
    term: "Actuarial Reserving",
    slug: "actuarial-reserving",
    category: "concepts",
    definition:
      "The process of estimating the total cost of future claim payments for policies already written. Reserves appear as liabilities on the balance sheet and directly affect reported profitability.",
    why_it_matters:
      "Reserve accuracy is critical. Under-reserving inflates current profits but creates future losses. Over-reserving depresses current results but provides cushion.",
    founder_angle:
      "AI-driven reserving is a high-value use case. Carriers spend significant actuarial resources on reserve estimation, and even small improvements in accuracy can move the needle on reported earnings.",
  },
  {
    term: "Cat Modeling",
    slug: "cat-modeling",
    category: "concepts",
    definition:
      "Catastrophe modeling: using statistical and simulation techniques to estimate potential losses from natural disasters (hurricanes, earthquakes) and man-made events.",
    why_it_matters:
      "Cat models drive pricing, capital allocation, and reinsurance purchasing decisions. Better models lead to better risk selection and pricing.",
    founder_angle:
      "AI/ML can significantly improve cat models by incorporating more granular data (satellite imagery, IoT sensors, climate projections). This is one of the highest-value use cases in reinsurance and large P&C carriers.",
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
    founder_angle:
      "Carriers are your primary customers for underwriting AI, claims automation, and pricing tools. They have the deepest pockets and most acute pain points.",
  },
  {
    term: "Broker / Intermediary",
    slug: "broker",
    category: "business-model",
    definition:
      "A company that distributes insurance products on behalf of carriers. Brokers advise clients, negotiate coverage, and earn commissions. Major brokers (MMC, AON, WTW) also provide risk consulting and reinsurance broking.",
    why_it_matters:
      "Brokers control distribution and client relationships. The top 3 brokers place a significant percentage of commercial insurance globally.",
    founder_angle:
      "Brokers are channel partners, not underwriters. They need AI for client analytics, placement optimization, and workflow automation — different value props than carriers.",
    example: "Marsh McLennan (MMC) is the world's largest insurance broker with $23B+ in revenue.",
  },
  {
    term: "MGA / MGU",
    slug: "mga",
    category: "business-model",
    definition:
      "Managing General Agent / Managing General Underwriter: a specialized intermediary that has been delegated underwriting authority by a carrier. MGAs price, bind, and sometimes handle claims on behalf of the carrier.",
    why_it_matters:
      "MGAs are the fastest-growing segment of the insurance market and are typically more tech-forward than traditional carriers.",
    founder_angle:
      "MGAs are often your best first customers — smaller, faster-moving, technology-friendly, and willing to adopt AI underwriting and pricing tools. Many successful insurtechs are structured as MGAs.",
  },
  {
    term: "Reinsurer",
    slug: "reinsurer-bm",
    category: "business-model",
    definition:
      "A company that provides insurance to other insurance companies. Reinsurers absorb portions of primary carriers' risks through treaties (automatic) or facultative (individual risk) agreements.",
    why_it_matters:
      "Reinsurers set the floor for insurance pricing. When reinsurance costs rise, primary premiums follow.",
    founder_angle:
      "Reinsurers process complex, data-heavy transactions. AI for treaty pricing, accumulation monitoring, and natural catastrophe modeling are high-value use cases with long but lucrative sales cycles.",
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
    founder_angle:
      "This regulatory constraint is your pitch: health payers literally cannot grow profits by reducing medical spending below the floor. The only path to margin expansion is administrative efficiency — exactly what AI delivers.",
  },
  {
    term: "Risk-Based Capital (RBC)",
    slug: "rbc",
    category: "regulation",
    definition:
      "A regulatory framework that requires insurers to maintain minimum capital levels proportional to the risks they underwrite. RBC ratios below certain thresholds trigger regulatory action.",
    why_it_matters:
      "Capital constraints limit growth. Companies with thin RBC margins are pressured to either raise capital or improve underwriting efficiency.",
    founder_angle:
      "RBC pressure creates technology buying urgency. If a carrier's capital is constrained, AI underwriting that improves risk selection can directly free up capital for growth.",
  },
  {
    term: "State-Based Regulation",
    slug: "state-regulation",
    category: "regulation",
    definition:
      "In the US, insurance is primarily regulated at the state level (not federal). Each state has its own insurance department, rate approval process, and consumer protection rules. The NAIC coordinates across states.",
    why_it_matters:
      "50-state regulation creates massive compliance overhead. Rate filings, policy forms, and market conduct requirements vary by state.",
    founder_angle:
      "The fragmented regulatory landscape is itself an AI opportunity. Compliance automation (automated form generation, regulatory monitoring, rate filing preparation) is a multi-billion dollar market.",
  },
  {
    term: "Surplus Lines",
    slug: "surplus-lines",
    category: "regulation",
    definition:
      "Insurance coverage placed with non-admitted carriers (not licensed in the insured's state). Surplus lines covers risks that admitted carriers won't write — emerging risks, unusual exposures, or high-risk categories.",
    why_it_matters:
      "Surplus lines is growing rapidly (now ~$100B+ market) as traditional carriers retreat from harder-to-model risks (cyber, climate).",
    founder_angle:
      "Surplus lines carriers are often early tech adopters — they write novel risks that require creative data analysis. Also less regulatory friction for new pricing approaches.",
  },
  {
    term: "10-K Filing",
    slug: "10-k",
    category: "regulation",
    definition:
      "An annual report required by the SEC from all publicly traded companies. Contains audited financial statements, management's discussion and analysis (MD&A), risk factors, and business descriptions.",
    why_it_matters:
      "10-Ks are the authoritative source of financial data. All metrics in InsurIntel are derived from XBRL-tagged data in 10-K filings via SEC EDGAR.",
    founder_angle:
      "10-K filings are a goldmine for competitive intelligence. The MD&A section reveals management's priorities, technology investments, and risk concerns — useful for tailoring your pitch.",
  },
  {
    term: "XBRL",
    slug: "xbrl",
    category: "regulation",
    definition:
      "eXtensible Business Reporting Language — a standardized format for electronic financial reporting. All SEC filings use XBRL tags to make financial data machine-readable.",
    why_it_matters:
      "XBRL enables automated extraction and comparison of financial data across companies. It's the technology that makes InsurIntel possible.",
    founder_angle:
      "Free, machine-readable financial data for 41 major insurance companies. Use it to size your market, identify prospects, and build data-driven pitch decks — all without expensive data vendors.",
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
