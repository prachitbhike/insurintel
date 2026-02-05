"use client";

import { useState } from "react";
import { Check, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface CompanyPickerProps {
  companies: { ticker: string; name: string; sector: string }[];
  selected: string[];
  onChange: (tickers: string[]) => void;
  maxSelections?: number;
}

function PopoverComponent({ children, ...props }: React.ComponentProps<typeof Popover>) {
  return <Popover {...props}>{children}</Popover>;
}

function PopoverTriggerComponent({ children, ...props }: React.ComponentProps<typeof PopoverTrigger>) {
  return <PopoverTrigger {...props}>{children}</PopoverTrigger>;
}

function PopoverContentComponent({ children, ...props }: React.ComponentProps<typeof PopoverContent>) {
  return <PopoverContent {...props}>{children}</PopoverContent>;
}

export function CompanyPicker({
  companies,
  selected,
  onChange,
  maxSelections = 5,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false);

  const toggleCompany = (ticker: string) => {
    if (selected.includes(ticker)) {
      onChange(selected.filter((t) => t !== ticker));
    } else if (selected.length < maxSelections) {
      onChange([...selected, ticker]);
    }
  };

  const removeCompany = (ticker: string) => {
    onChange(selected.filter((t) => t !== ticker));
  };

  return (
    <div className="space-y-2">
      <PopoverComponent open={open} onOpenChange={setOpen}>
        <PopoverTriggerComponent asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between sm:w-80"
          >
            {selected.length > 0
              ? `${selected.length} companies selected`
              : "Select companies..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTriggerComponent>
        <PopoverContentComponent className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Search companies..." />
            <CommandList>
              <CommandEmpty>No company found.</CommandEmpty>
              <CommandGroup>
                {companies.map((company) => (
                  <CommandItem
                    key={company.ticker}
                    value={`${company.ticker} ${company.name}`}
                    onSelect={() => toggleCompany(company.ticker)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(company.ticker)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{company.ticker}</span>
                    <span className="ml-2 text-muted-foreground text-xs truncate">
                      {company.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContentComponent>
      </PopoverComponent>

      <div className="flex flex-wrap gap-1.5">
        {selected.map((ticker) => (
          <Badge key={ticker} variant="secondary" className="gap-1">
            {ticker}
            <button
              onClick={() => removeCompany(ticker)}
              className="ml-0.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selected.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Select up to {maxSelections} companies to compare
          </p>
        )}
      </div>
    </div>
  );
}
