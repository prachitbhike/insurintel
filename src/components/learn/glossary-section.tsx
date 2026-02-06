import { type GlossaryEntry } from "@/lib/data/glossary";

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
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="divide-y">
        {entries.map((entry) => (
          <div
            key={entry.slug}
            className="grid grid-cols-[180px_1fr] gap-6 py-3.5 sm:grid-cols-[220px_1fr]"
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
    </div>
  );
}
