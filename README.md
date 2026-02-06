# InsurIntel

Insurance industry KPI dashboard tracking 41 publicly traded companies across 5 sectors using financial data from SEC EDGAR.

## Sectors & Companies

| Sector | Companies | Key Metrics |
|--------|-----------|-------------|
| **Property & Casualty** | CB, PGR, TRV, ALL, AIG, HIG, ACGL, WRB, CINF, MKL, CNA, ERIE, AFG, ORI, AIZ | Combined ratio, loss ratio, expense ratio, net premiums earned, ROE |
| **Life Insurance** | MET, PRU, AFL, CRBG, PFG, EQH, UNM, GL, LNC | Net income, ROE, ROA, book value per share, total assets |
| **Health Insurance** | UNH, CI, ELV, HUM, CNC, MOH, CVS | Medical loss ratio, revenue, net income, ROE, EPS |
| **Reinsurance** | BRK.B, RNR, EG, RGA | Combined ratio, loss ratio, net premiums earned, ROE, BVPS |
| **Insurance Brokers** | MMC, AON, AJG, WTW, BRO, RYAN | Revenue, net income, ROE, EPS, debt-to-equity |

## Features

- **Dashboard** — Sector-level averages, market highlights (top ROE, best combined ratio, fastest growth)
- **Company profiles** — KPI grid with YoY comparison, time series charts, peer comparison vs sector averages, annual/quarterly financials
- **Sector views** — Sector averages, company rankings by key metrics
- **Comparison tool** — Side-by-side metrics and charts for up to 5 companies

## Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components, ISR)
- **Database:** Supabase (PostgreSQL with materialized views)
- **Data source:** SEC EDGAR XBRL API (free, no authentication)
- **UI:** shadcn/ui, Tailwind CSS v4, Recharts, TanStack Table
- **Deployment:** Vercel with daily cron jobs

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- Run the migration in `supabase/migrations/001_initial_schema.sql` against your database

### Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<any-secret-for-api-auth>
EDGAR_USER_AGENT=<AppName your-email@example.com>
```

`EDGAR_USER_AGENT` is required by SEC — provide your app name and a contact email.

### Setup

```bash
npm install
npx tsx scripts/initial-seed.ts   # Seed companies + fetch EDGAR data (run once)
npm run dev                        # Start dev server at http://localhost:3000
```

The initial seed fetches XBRL data for all 41 companies. Run it locally to avoid Vercel function timeouts.

### Data Refresh

In production, two Vercel cron jobs keep data current:

- **6:00 AM daily** — `/api/cron/ingest-facts` ingests data for 8 companies (full universe refreshes every ~5 days)
- **7:00 AM daily** — `/api/cron/refresh-views` refreshes materialized views

## EDGAR / XBRL Notes

Understanding the data source is important for interpreting dashboard results:

- **Fiscal year field is misleading** — EDGAR's `fy` field is the *filing* year, not the data's period year. A 10-K filed in 2024 may include CY2022 comparative data tagged as `fy=2024`. The parser uses the `end` date to determine the actual period year.
- **XBRL tag aliases** — Each metric maps to multiple XBRL concept tags (e.g. `net_premiums_earned` tries `PremiumsEarnedNet`, `NetPremiumsEarned`, `PremiumsEarned`). Alias order is first-match-wins, so the most specific tag comes first.
- **Derived metrics are sector-scoped** — Loss ratio, expense ratio, and combined ratio are only computed for P&C and Reinsurance. Medical loss ratio (MLR) is Health-only and uses `net_premiums_earned` as the denominator (not `revenue`) because companies like CI, CVS, and UNH have massive PBM/pharmacy revenue that would skew the ratio.
- **Rate limiting** — SEC enforces a 10 requests/second limit. The app uses a token bucket rate limiter at 8 req/sec to stay safely under.

### Known Data Quirks

These are expected behaviors, not bugs:

| Company | Observation | Reason |
|---------|-------------|--------|
| AIZ | Loss ratio ~28% | Heavy reinsurance ceding (net vs gross basis) |
| BRK.B | Only ~7 metrics | Conglomerate XBRL doesn't map to insurance-specific tags |
| ERIE | Missing underwriting metrics | Management company structure, not an underwriter |
| AON, AJG | Missing `revenue` | XBRL concept tags don't match current aliases |
| Various | Revenue < premiums | GAAP reporting difference, not an error |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages + API routes
│   ├── api/cron/         # Cron endpoints (ingest-facts, refresh-views)
│   ├── companies/        # Company list + /companies/[ticker] detail
│   ├── sectors/          # Sector list + /sectors/[slug] detail
│   └── compare/          # Company comparison tool
├── components/           # React components (ui/, layout/, charts/, etc.)
├── lib/
│   ├── edgar/            # EDGAR API client, XBRL parser, rate limiter
│   ├── metrics/          # Derived calculations, definitions, formatters
│   ├── queries/          # Supabase query functions
│   ├── supabase/         # Supabase client setup (server, client, admin)
│   └── data/             # Seed data and sector definitions
└── types/                # TypeScript type definitions
supabase/
└── migrations/           # Database schema (tables, views, indexes, RLS)
scripts/
└── initial-seed.ts       # One-time data population script
```
