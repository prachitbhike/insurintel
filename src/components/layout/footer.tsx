export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col items-center gap-3 py-3 px-4 md:flex-row md:justify-between md:px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Live &mdash; InsurIntel
          </span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground text-center md:text-right">
          Data sourced from{" "}
          <a
            href="https://www.sec.gov/edgar/searchedgar/companysearch"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            SEC EDGAR
          </a>{" "}
          XBRL API. Not financial advice.
        </p>
      </div>
    </footer>
  );
}
