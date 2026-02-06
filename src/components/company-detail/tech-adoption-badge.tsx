import { Badge } from "@/components/ui/badge";
import { TECH_CLASSIFICATIONS } from "@/types/tech-signals";

interface TechAdoptionBadgeProps {
  classification: "tech-forward" | "in-transition" | "tech-laggard";
  className?: string;
}

export function TechAdoptionBadge({ classification, className }: TechAdoptionBadgeProps) {
  const config = TECH_CLASSIFICATIONS[classification];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={`${config.color} text-[10px] font-medium ${className ?? ""}`}
    >
      {config.label}
    </Badge>
  );
}
