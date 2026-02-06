import { type Sector } from "@/types/database";

export interface UseCase {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  applicableSectors: Sector[];
  painMetrics: string[];
  signalMetrics: string[];
  tamFormula: "expense_based" | "loss_based" | "admin_based" | "revenue_pct";
  tamCaptureRate: number;
  tamDescription: string;
  tags: string[];
}

export const USE_CASES: UseCase[] = [
  {
    id: "claims-triage",
    name: "Claims Triage & STP",
    shortName: "Claims Triage",
    description:
      "Automate initial claims assessment and routing. AI-driven straight-through processing can resolve 40-60% of low-complexity claims without human intervention.",
    icon: "FileSearch",
    applicableSectors: ["P&C", "Reinsurance"],
    painMetrics: ["loss_ratio", "combined_ratio"],
    signalMetrics: ["losses_incurred", "net_premiums_earned"],
    tamFormula: "loss_based",
    tamCaptureRate: 0.15,
    tamDescription:
      "15% of excess loss ratio (vs sector best) addressable through automated triage and STP",
    tags: ["claims", "automation", "stp"],
  },
  {
    id: "ml-underwriting",
    name: "ML-Driven Underwriting",
    shortName: "ML Underwriting",
    description:
      "Replace manual risk selection with predictive models. ML underwriting reduces expense ratios by automating data gathering, risk scoring, and pricing decisions.",
    icon: "Brain",
    applicableSectors: ["P&C", "Reinsurance", "Life"],
    painMetrics: ["expense_ratio", "combined_ratio"],
    signalMetrics: ["underwriting_expenses", "net_premiums_earned"],
    tamFormula: "expense_based",
    tamCaptureRate: 0.25,
    tamDescription:
      "25% of excess expense ratio (vs sector best) addressable through ML-driven underwriting automation",
    tags: ["underwriting", "ml", "pricing"],
  },
  {
    id: "prior-auth",
    name: "Prior Auth Automation",
    shortName: "Prior Auth",
    description:
      "Automate prior authorization decisions using clinical guidelines and patient data. Reduces admin burden — the #1 cost driver in managed care operations.",
    icon: "ClipboardCheck",
    applicableSectors: ["Health"],
    painMetrics: ["medical_loss_ratio"],
    signalMetrics: ["revenue", "net_income"],
    tamFormula: "admin_based",
    tamCaptureRate: 0.2,
    tamDescription:
      "20% of admin margin (1 - MLR) addressable through prior auth automation",
    tags: ["health", "prior-auth", "admin"],
  },
  {
    id: "policy-admin",
    name: "Policy Admin & Servicing",
    shortName: "Policy Admin",
    description:
      "Modernize policy lifecycle management with AI-powered document processing, automated endorsements, and intelligent customer service.",
    icon: "FileText",
    applicableSectors: ["P&C", "Life", "Health"],
    painMetrics: ["expense_ratio"],
    signalMetrics: ["net_premiums_earned", "revenue"],
    tamFormula: "expense_based",
    tamCaptureRate: 0.1,
    tamDescription:
      "10% of excess expense ratio addressable through policy admin modernization",
    tags: ["policy", "servicing", "admin"],
  },
  {
    id: "fraud-detection",
    name: "AI Fraud Detection",
    shortName: "Fraud Detection",
    description:
      "Detect fraudulent claims and applications using anomaly detection, network analysis, and behavioral patterns. Reduces loss leakage by 3-8%.",
    icon: "ShieldAlert",
    applicableSectors: ["P&C", "Health", "Life"],
    painMetrics: ["loss_ratio", "combined_ratio"],
    signalMetrics: ["losses_incurred", "net_premiums_earned"],
    tamFormula: "loss_based",
    tamCaptureRate: 0.05,
    tamDescription:
      "5% of excess loss ratio addressable through AI-powered fraud detection",
    tags: ["fraud", "detection", "claims"],
  },
  {
    id: "digital-distribution",
    name: "Digital Distribution",
    shortName: "Digital Dist.",
    description:
      "AI-powered quote comparison, automated bind flows, and digital-first distribution platforms that can undercut traditional broker commissions on standard lines.",
    icon: "Globe",
    applicableSectors: ["Brokers", "P&C"],
    painMetrics: ["expense_ratio", "debt_to_equity"],
    signalMetrics: ["revenue", "net_premiums_earned"],
    tamFormula: "revenue_pct",
    tamCaptureRate: 0.08,
    tamDescription:
      "8% of revenue addressable through digital distribution platforms",
    tags: ["distribution", "digital", "broker"],
  },
  {
    id: "risk-cat-modeling",
    name: "AI Risk & Cat Modeling",
    shortName: "Cat Modeling",
    description:
      "ML-enhanced catastrophe modeling improves loss estimates and capital allocation. Real-time exposure monitoring using satellite and IoT data.",
    icon: "CloudLightning",
    applicableSectors: ["Reinsurance", "P&C"],
    painMetrics: ["loss_ratio", "combined_ratio"],
    signalMetrics: ["losses_incurred", "net_premiums_earned"],
    tamFormula: "loss_based",
    tamCaptureRate: 0.1,
    tamDescription:
      "10% of excess loss ratio addressable through improved cat modeling and risk selection",
    tags: ["reinsurance", "cat-modeling", "risk"],
  },
  {
    id: "compliance-automation",
    name: "Compliance Automation",
    shortName: "Compliance",
    description:
      "Automate regulatory reporting, filing compliance, and audit preparation. Reduces compliance headcount and error rates across all insurance operations.",
    icon: "Scale",
    applicableSectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers"],
    painMetrics: ["expense_ratio"],
    signalMetrics: ["net_premiums_earned", "revenue"],
    tamFormula: "expense_based",
    tamCaptureRate: 0.05,
    tamDescription:
      "5% of expense base addressable through compliance automation",
    tags: ["compliance", "regulation", "reporting"],
  },
];

export function getUseCaseById(id: string): UseCase | undefined {
  return USE_CASES.find((uc) => uc.id === id);
}

export function getUseCasesForSector(sector: Sector): UseCase[] {
  return USE_CASES.filter((uc) => uc.applicableSectors.includes(sector));
}
