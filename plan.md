# Plan: Fix & Improve Sector Dashboard Charts

## Audit Summary

The sector dashboard currently renders 3 components:
1. **Hero KPI Strip** (`HeroBenchmarksV2`) — works correctly
2. **Sector Analysis Card** (`SectorTrendCharts`) — 3-tab card with Trend/Snapshot/Rankings
3. **Top Prospects sidebar** (`TopProspectsSection compact`) — works correctly

### Current Architecture

`page.tsx` calls `getBulkScoringData()` which fetches from `SCORING_METRICS`:
```
expense_ratio, combined_ratio, loss_ratio, medical_loss_ratio, roe, debt_to_equity,
net_premiums_earned, revenue, net_income, total_assets, investment_income, eps,
book_value_per_share, roa
```

Then `buildSectorTrendData()` builds `SectorTrendData` from `bulkScoringData.timeseries` using each sector's `key_metrics` list.

### Issues Found

#### Issue 1: Missing `premium_growth_yoy` in data fetch (CRITICAL)

`premium_growth_yoy` is NOT in `SCORING_METRICS`, so it's never fetched by `getBulkScoringData()`.

**Who's affected:**
- **Opportunity Landscape** (not currently rendered, but still broken) uses it as Y-axis for P&C and Reinsurance
- P&C and Reinsurance `key_metrics` don't include it, so `SectorTrendCharts` Rankings tab can't show it either

**Fix:** Add `premium_growth_yoy` to `SCORING_METRICS` in `metrics.ts`.

#### Issue 2: Trend line chart has too many lines for large sectors (USABILITY)

The "Trend" tab renders one line per company. Sector sizes:
- **P&C: 15 companies** → 15 lines + sector avg = 16 lines. Unreadable spaghetti.
- **Life: 9 companies** → 9 lines. Borderline.
- **Health: 7** → Manageable.
- **Reinsurance: 4** → Perfect for line chart.
- **Brokers: 6** → Manageable.

With 5 chart colors cycling, P&C has 3 companies sharing each color. The Legend alone takes substantial space.

**Fix:** For sectors with >8 companies, replace the multi-line chart with a **range band + sector average** approach:
- Show a shaded area (min-max range) across the sector
- A bold line for sector average
- Optionally highlight the best and worst companies as labeled lines
- This tells the story (spread, trend direction, outliers) without spaghetti

For sectors ≤8 companies, keep the current multi-line chart — it works well.

#### Issue 3: Opportunity Landscape and Sector Story Chart are not rendered (CRITICAL)

The refactored `sector-dashboard.tsx` only renders `SectorTrendCharts` + `TopProspectsSection`. The two novel charts from the original plan — **OpportunityLandscape** and **SectorStoryChart** — exist as components but are no longer wired into the dashboard.

**Fix:** Add them back to `sector-dashboard.tsx`. The data computation (`computeLandscapeData`, story chart data) needs to happen in `page.tsx` and be passed as props.

#### Issue 4: `SectorTrendCharts` Quarterly toggle does nothing (MINOR)

The `PeriodSelector` toggles between annual/quarterly, but `quarterlyTrendData` is never passed (always `undefined`). The toggle shows but clicking "Quarterly" renders empty.

**Fix:** Remove the quarterly toggle from `SectorTrendCharts` since `getBulkScoringData` only fetches annual data. Add it back later when quarterly data pipeline exists.

#### Issue 5: Rankings tab `selectedMetric` default may not have data (MINOR)

Rankings tab defaults to `availableMetrics[0]`. For P&C that's `combined_ratio` which is fine. But the dropdown shows all `key_metrics` and some companies may lack certain metrics (e.g., ERIE has no underwriting metrics). This isn't broken but the empty bars are confusing.

**Fix:** No code change needed — the existing filtering (`entries.filter`) already handles nulls. Just a note.

---

## Implementation Plan

### Step 1: Add `premium_growth_yoy` to SCORING_METRICS

**File:** `src/lib/queries/metrics.ts`

Add `"premium_growth_yoy"` to the `SCORING_METRICS` array. This ensures it gets fetched in both `latestMetrics` and `timeseries`.

### Step 2: Replace spaghetti line chart with range band for large sectors

**File:** `src/components/sectors/sector-trend-charts.tsx`

For the "Trend" tab, add logic:
- If `activeTickers.length > 8`: render an `AreaChart` with:
  - A shaded band between min and max values per period (using a composed area)
  - A bold line for sector average
  - Labeled dots for the best and worst company in the latest period
- If `activeTickers.length <= 8`: keep the current `LineChart` (works well for Re/Health/Brokers)

Implementation detail: compute `{ period, min, max, avg, bestTicker, worstTicker, bestValue, worstValue }` from the raw data. Use Recharts `Area` with `type="monotone"` for the band and `Line` for the average.

### Step 3: Wire OpportunityLandscape and SectorStoryChart back in

**File:** `src/app/page.tsx`
- Re-add the landscape data computation (`computeLandscapeData`) and story chart data computation
- Pass `landscapePoints`, `landscapeAvgX`, `landscapeAvgY`, `landscapeConfig`, `storyChartData`, `storyChartAvg` to `SectorDashboard`

**File:** `src/components/dashboard/sector-dashboard.tsx`
- Add props for landscape and story chart data
- Render `OpportunityLandscape` below the hero section
- Render `SectorStoryChart` in a 2-column layout alongside the Sector Analysis card
- Layout: Hero → KPI Strip → [Landscape] → [Analysis + Story Chart] → [Prospects]

### Step 4: Remove quarterly toggle

**File:** `src/components/sectors/sector-trend-charts.tsx`
- Remove the `PeriodSelector` and `periodType` state
- Remove the `quarterlyTrendData` prop
- Always use `trendData` (annual)

### Step 5: Verify

- `npm run typecheck` — clean
- `npm run build` — clean
- Check each sector visually:
  - P&C (15 companies): range band trend, landscape scatter, story bar chart
  - Life (9): range band trend, landscape scatter, story bar chart
  - Health (7): multi-line trend, landscape scatter, story bar chart
  - Reinsurance (4): multi-line trend, landscape scatter, story bar chart
  - Brokers (6): multi-line trend, landscape scatter, story bar chart

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/lib/queries/metrics.ts` | Modify | Add `premium_growth_yoy` to SCORING_METRICS |
| `src/components/sectors/sector-trend-charts.tsx` | Modify | Range band chart for large sectors, remove quarterly toggle |
| `src/app/page.tsx` | Modify | Re-add landscape/story chart data computation |
| `src/components/dashboard/sector-dashboard.tsx` | Modify | Add landscape + story chart to layout |
