"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PeriodSelectorProps {
  value: "annual" | "quarterly";
  onValueChange: (value: "annual" | "quarterly") => void;
}

export function PeriodSelector({ value, onValueChange }: PeriodSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as "annual" | "quarterly")}
    >
      <TabsList className="h-8">
        <TabsTrigger value="annual" className="text-xs px-3">
          Annual
        </TabsTrigger>
        <TabsTrigger value="quarterly" className="text-xs px-3">
          Quarterly
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
