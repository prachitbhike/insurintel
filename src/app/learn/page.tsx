import { type Metadata } from "next";
import { GlossarySection } from "@/components/learn/glossary-section";
import { getGlossaryByCategory, GLOSSARY_CATEGORIES, type GlossaryCategory } from "@/lib/data/glossary";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Insurance glossary — understand key metrics, business models, and regulations.",
};

export default function LearnPage() {
  const byCategory = getGlossaryByCategory();
  const categoryOrder: GlossaryCategory[] = ["metrics", "concepts", "business-model", "regulation"];

  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60 mb-2">
          Learn
        </p>
        <h1 className="text-3xl font-display tracking-tight">
          Insurance Glossary
        </h1>
        <p className="mt-2 text-base text-muted-foreground leading-relaxed max-w-2xl">
          Key terms, metrics, and concepts for understanding the insurance
          industry.
        </p>
      </div>

      <div className="space-y-10">
        {categoryOrder.map((cat) => (
          <GlossarySection
            key={cat}
            label={GLOSSARY_CATEGORIES[cat].label}
            description={GLOSSARY_CATEGORIES[cat].description}
            entries={byCategory[cat]}
          />
        ))}
      </div>
    </div>
  );
}
