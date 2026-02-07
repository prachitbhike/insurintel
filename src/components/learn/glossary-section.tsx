import { type GlossaryEntry } from "@/lib/data/glossary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlossarySectionProps {
  label: string;
  description: string;
  entries: GlossaryEntry[];
}

export function GlossarySection({
  label,
  description,
  entries,
}: GlossarySectionProps) {
  if (entries.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display tracking-tight">
          {label}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/50">
          {entries.map((entry, i) => (
            <div
              key={entry.slug}
              className={`grid grid-cols-[180px_1fr] gap-6 py-3.5 sm:grid-cols-[220px_1fr] ${
                i % 2 === 0 ? "bg-muted/30" : ""
              } -mx-2 px-2 rounded-sm`}
            >
              <div className="font-medium text-sm">{entry.term}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {entry.definition}
                {entry.formula && (
                  <span className="ml-1 font-mono text-xs text-foreground/70">
                    ({entry.formula})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
