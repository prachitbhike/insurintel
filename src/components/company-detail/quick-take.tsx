import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface QuickTakeProps {
  sentences: string[];
}

export function QuickTake({ sentences }: QuickTakeProps) {
  if (sentences.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="flex gap-3 pt-5 pb-4">
        <Lightbulb className="h-5 w-5 text-primary/60 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          {sentences.map((s, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-base leading-relaxed text-foreground/90 font-display italic"
                  : "text-sm leading-relaxed text-foreground/80"
              }
            >
              {s}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
