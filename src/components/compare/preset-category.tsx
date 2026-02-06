import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type ComparisonPreset } from "@/lib/queries/presets";

interface PresetCategoryProps {
  category: string;
  presets: ComparisonPreset[];
}

export function PresetCategory({ category, presets }: PresetCategoryProps) {
  if (presets.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {category}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((p) => (
          <Link
            key={p.title}
            href={`/compare?companies=${p.tickers.join(",")}`}
            className="group"
          >
            <Card className="h-full transition-all duration-150 group-hover:shadow-md group-hover:border-foreground/15">
              <CardContent className="pt-4 pb-3.5 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">{p.title}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
                <div className="flex gap-1.5 mt-1">
                  {p.tickers.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-[10px] font-mono"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
