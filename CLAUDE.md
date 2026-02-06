# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm test             # Run tests (Vitest)
npm run test:watch   # Run tests in watch mode
npx tsx scripts/initial-seed.ts  # One-time database seed (run locally, not on Vercel)
```

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Admin writes (API routes, seed script)
- `CRON_SECRET` — Bearer token for cron/seed API routes
- `EDGAR_USER_AGENT` — Required by SEC EDGAR (format: `AppName email@example.com`)

## Architecture

**Insurance KPI Dashboard** — Tracks 41 companies across 5 sectors (P&C, Life, Health, Reinsurance, Brokers) using SEC EDGAR XBRL data.

### Data Pipeline

```
SEC EDGAR XBRL API → parser.ts (parse + deduplicate) → calculator.ts (derive ratios)
  → Supabase financial_metrics (EAV table) → materialized views → RSC pages (ISR 1hr)
```

- **Ingestion:** `src/lib/edgar/client.ts` fetches company facts, `parser.ts` extracts metrics from XBRL with multiple tag aliases per concept (`concepts.ts`), `calculator.ts` computes derived ratios (combined ratio, ROE, etc.)
- **Storage:** EAV pattern — `financial_metrics` stores (company_id, metric_name, metric_value, fiscal_year, period_type). Four materialized views (`mv_latest_metrics`, `mv_sector_averages`, `mv_company_rankings`, `mv_metric_timeseries`) power dashboard reads.
- **Refresh:** Daily Vercel crons — ingest 8 companies at 6 AM, refresh views at 7 AM. Full universe refreshes every ~5 days.
- **Rate limiting:** Token bucket at 8 req/sec for EDGAR API (must stay under SEC's 10/sec limit). Singleton in `rate-limiter.ts`.

### Supabase Clients

Three separate clients for different contexts:
- `src/lib/supabase/server.ts` — Server Components (read-only, uses cookies)
- `src/lib/supabase/client.ts` — Client Components
- `src/lib/supabase/admin.ts` — API routes (service role key, write access)

### Key Modules

- `src/lib/edgar/concepts.ts` — XBRL tag → metric name mappings (14 base metrics, multiple aliases each)
- `src/lib/metrics/calculator.ts` — Derived metric calculations (loss ratio, combined ratio, ROE, ROA, etc.)
- `src/lib/metrics/definitions.ts` — Metric catalog with metadata (unit, category, sector applicability, higher_is_better)
- `src/lib/metrics/formatters.ts` — Display formatting ($123.4B, 95.2%, etc.)
- `src/lib/queries/` — Supabase query functions organized by domain (companies, metrics, sectors, compare)
- `src/lib/data/companies-seed.ts` — 41 companies with CIK numbers
- `src/lib/data/sectors.ts` — 5 sector definitions with colors and key metrics

### Page Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | SSR+ISR | Dashboard with overview stats, sector cards, market highlights |
| `/companies` | SSR+ISR | Sortable/filterable table (TanStack Table) |
| `/companies/[ticker]` | Static+ISR | Company detail with KPIs, charts, peer comparison, financials |
| `/sectors` | SSR+ISR | Sector overview grid |
| `/sectors/[slug]` | Static+ISR | Sector detail with rankings and company table |
| `/compare` | Client | Interactive comparison tool (up to 5 companies, URL state) |

Company and sector detail pages use `generateStaticParams` for static generation.

### API Routes

- `POST /api/seed` — Seed companies table (auth: Bearer CRON_SECRET)
- `GET /api/cron/ingest-facts` — Daily ingestion of 8 companies (auth: Bearer CRON_SECRET)
- `GET /api/cron/refresh-views` — Refresh materialized views (auth: Bearer CRON_SECRET)
- `GET /api/compare` — Comparison data endpoint for client component

### Component Organization

- `src/components/ui/` — shadcn/ui primitives (new-york style, Tailwind v4, CSS variables)
- `src/components/layout/` — Header, footer, theme provider/toggle
- `src/components/dashboard/` — Overview stats, KPI cards, sector cards, highlights table
- `src/components/company-detail/` — KPI grid, metric charts, peer comparison, financial table
- `src/components/companies/` — Company table + TanStack column definitions
- `src/components/sectors/` — Sector overview grid, rankings chart
- `src/components/compare/` — Company picker, comparison table/chart
- `src/components/charts/` — Recharts wrappers (line, bar, area, sparkline)

## EDGAR / XBRL Pitfalls

These are critical to understand when modifying the data pipeline:

- **`fy` is the filing year, not the data year.** A 10-K filed in 2024 includes CY2022 comparatives tagged `fy=2024`. Always use the `end` date to determine the actual period year.
- **XBRL alias order is first-match-wins.** Put the most specific/accurate tag first in `concepts.ts`. Alias ordering directly affects data correctness.
- **Derived metrics are sector-scoped.** Loss/expense/combined ratio → P&C + Reinsurance only. MLR → Health only. Health MLR uses `net_premiums_earned` as denominator (not `revenue`) because CI/CVS/UNH have massive PBM/pharmacy revenue.
- **Known data quirks (not bugs):** AIZ loss ratio ~28% (heavy reinsurance ceding), BRK.B only ~7 metrics (conglomerate XBRL), ERIE missing underwriting metrics (management company), AON/AJG missing `revenue` (alias gap), revenue < premiums for some insurers (GAAP reporting difference).
- **Do NOT nest `ResponsiveContainer`** inside chart wrappers — shadcn/ui `ChartContainer` already provides one. Nesting causes zero-dimension rendering.

## Conventions

- **Server Components by default.** Client components marked with `"use client"`.
- **Path alias:** `@/*` maps to `src/*`.
- **ISR:** All SSR pages use `export const revalidate = 3600`.
- **Database naming:** snake_case for columns and metric names.
- **Sector type:** Union literal `'P&C' | 'Life' | 'Health' | 'Reinsurance' | 'Brokers'` — enforced at DB level with CHECK constraint.
- **shadcn/ui config:** new-york style, RSC-enabled, lucide icons. Add components via `npx shadcn@latest add <component>`.
- **Styling:** Tailwind v4 with CSS-first config in `globals.css`. Sector colors: blue (P&C), emerald (Life), violet (Health), amber (Reinsurance), rose (Brokers).
- **Database schema:** `supabase/migrations/001_initial_schema.sql` is the source of truth. RLS enabled with public read-only policies.
