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
  tamFormula: "expense_based" | "loss_based" | "admin_based";
  tamDescription: string;
  tags: string[];
}

export const USE_CASES: UseCase[] = [
  {
    id: "claims-processing",
    name: "Claims Processing",
    shortName: "Claims",
    description:
      "Claims handling and loss adjustment expenses. Companies with higher loss ratios have larger claims cost bases.",
    icon: "FileSearch",
    applicableSectors: ["P&C", "Reinsurance", "Mortgage Insurance"],
    painMetrics: ["loss_ratio", "combined_ratio"],
    signalMetrics: ["losses_incurred", "net_premiums_earned"],
    tamFormula: "loss_based",
    tamDescription:
      "(Company loss ratio - sector minimum) / 100 x net premiums earned. Sector minimum used as best-in-class benchmark.",
    tags: ["claims"],
  },
  {
    id: "underwriting-ops",
    name: "Underwriting Operations",
    shortName: "Underwriting",
    description:
      "Risk selection, pricing, and policy issuance. Higher expense ratios relative to peers indicate room for operational improvement in underwriting processes.",
    icon: "Brain",
    applicableSectors: ["P&C", "Reinsurance", "Life", "Mortgage Insurance"],
    painMetrics: ["expense_ratio", "combined_ratio"],
    signalMetrics: ["underwriting_expenses", "net_premiums_earned"],
    tamFormula: "expense_based",
    tamDescription:
      "(Company expense ratio - sector minimum) / 100 x net premiums earned. Sector minimum used as best-in-class benchmark.",
    tags: ["underwriting", "pricing"],
  },
  {
    id: "admin-operations",
    name: "Administrative Operations",
    shortName: "Admin Ops",
    description:
      "Prior authorization, member services, and claims adjudication. The admin margin (1 - MLR) represents all non-medical spending including operations and profit.",
    icon: "ClipboardCheck",
    applicableSectors: ["Health"],
    painMetrics: ["medical_loss_ratio"],
    signalMetrics: ["revenue", "net_income"],
    tamFormula: "admin_based",
    tamDescription:
      "(1 - MLR/100) x premium base. Represents total admin margin pool (includes operations, overhead, and profit — not solely addressable technology spend).",
    tags: ["health", "admin"],
  },
  {
    id: "policy-servicing",
    name: "Policy Servicing",
    shortName: "Servicing",
    description:
      "Policy lifecycle management — endorsements, renewals, and customer service. Part of the expense ratio that varies widely across peers.",
    icon: "FileText",
    applicableSectors: ["P&C", "Life", "Health", "Title", "Mortgage Insurance"],
    painMetrics: ["expense_ratio"],
    signalMetrics: ["net_premiums_earned", "revenue"],
    tamFormula: "expense_based",
    tamDescription:
      "(Company expense ratio - sector minimum) / 100 x net premiums earned. Represents total expense gap, not isolated to servicing alone.",
    tags: ["policy", "servicing"],
  },
  {
    id: "compliance-reporting",
    name: "Compliance & Reporting",
    shortName: "Compliance",
    description:
      "Regulatory reporting, filing compliance, and audit preparation. A component of operating expenses across all insurance sectors.",
    icon: "Scale",
    applicableSectors: ["P&C", "Life", "Health", "Reinsurance", "Brokers", "Title", "Mortgage Insurance"],
    painMetrics: ["expense_ratio"],
    signalMetrics: ["net_premiums_earned", "revenue"],
    tamFormula: "expense_based",
    tamDescription:
      "(Company expense ratio - sector minimum) / 100 x premium/revenue base. Represents total expense gap across all operating functions.",
    tags: ["compliance", "regulation", "reporting"],
  },
];

export function getUseCaseById(id: string): UseCase | undefined {
  return USE_CASES.find((uc) => uc.id === id);
}

export function getUseCasesForSector(sector: Sector): UseCase[] {
  return USE_CASES.filter((uc) => uc.applicableSectors.includes(sector));
}
