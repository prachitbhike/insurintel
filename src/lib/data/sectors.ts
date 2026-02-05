import { type Sector } from "@/types/database";

export interface SectorInfo {
  name: Sector;
  slug: string;
  label: string;
  description: string;
  color: string;
  key_metrics: string[];
}

export const SECTORS: SectorInfo[] = [
  {
    name: "P&C",
    slug: "p-and-c",
    label: "Property & Casualty",
    description:
      "Companies providing property, auto, commercial, and specialty insurance lines.",
    color: "bg-blue-500",
    key_metrics: [
      "combined_ratio",
      "loss_ratio",
      "expense_ratio",
      "net_premiums_earned",
      "roe",
    ],
  },
  {
    name: "Life",
    slug: "life",
    label: "Life Insurance",
    description:
      "Companies providing life insurance, annuities, and retirement products.",
    color: "bg-emerald-500",
    key_metrics: [
      "net_income",
      "roe",
      "roa",
      "book_value_per_share",
      "total_assets",
    ],
  },
  {
    name: "Health",
    slug: "health",
    label: "Health Insurance",
    description:
      "Managed care and health insurance companies providing medical coverage.",
    color: "bg-violet-500",
    key_metrics: [
      "medical_loss_ratio",
      "revenue",
      "net_income",
      "roe",
      "eps",
    ],
  },
  {
    name: "Reinsurance",
    slug: "reinsurance",
    label: "Reinsurance",
    description:
      "Companies providing insurance to other insurance companies.",
    color: "bg-amber-500",
    key_metrics: [
      "combined_ratio",
      "loss_ratio",
      "net_premiums_earned",
      "roe",
      "book_value_per_share",
    ],
  },
  {
    name: "Brokers",
    slug: "brokers",
    label: "Insurance Brokers",
    description:
      "Companies that act as intermediaries between insurance buyers and carriers.",
    color: "bg-rose-500",
    key_metrics: ["revenue", "net_income", "roe", "eps", "debt_to_equity"],
  },
];

export function getSectorBySlug(slug: string): SectorInfo | undefined {
  return SECTORS.find((s) => s.slug === slug);
}

export function getSectorByName(name: Sector): SectorInfo | undefined {
  return SECTORS.find((s) => s.name === name);
}

export function getSectorSlug(name: Sector): string {
  return SECTORS.find((s) => s.name === name)?.slug ?? name.toLowerCase();
}
