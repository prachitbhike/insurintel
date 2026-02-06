import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col items-center gap-4 py-6 px-4 md:flex-row md:justify-between md:px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="font-display text-lg tracking-tight">InsurIntel</span>
        </div>
        <p className="text-xs text-muted-foreground text-center md:text-right">
          Data sourced from{" "}
          <a
            href="https://www.sec.gov/edgar/searchedgar/companysearch"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            SEC EDGAR
          </a>{" "}
          XBRL API. Not financial advice. For informational purposes only.
        </p>
      </div>
    </footer>
  );
}
