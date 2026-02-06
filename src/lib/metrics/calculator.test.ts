import { describe, it, expect } from "vitest";
import { calculateDerivedMetrics, calculateYoyGrowth } from "./calculator";
import { type ParsedMetric } from "@/types/metric";

function makeMetric(
  name: string,
  value: number,
  overrides: Partial<ParsedMetric> = {}
): ParsedMetric {
  return {
    metric_name: name,
    value,
    unit: "currency",
    period_type: "annual",
    fiscal_year: 2023,
    fiscal_quarter: null,
    period_start_date: "2023-01-01",
    period_end_date: "2023-12-31",
    accession_number: "test",
    filed_at: "2024-02-15",
    form: "10-K",
    ...overrides,
  };
}

describe("calculateDerivedMetrics", () => {
  it("calculates loss ratio for P&C", () => {
    const raw = [
      makeMetric("losses_incurred", 700e6),
      makeMetric("net_premiums_earned", 1000e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual", "P&C");
    const lossRatio = derived.find((d) => d.metric_name === "loss_ratio");
    expect(lossRatio).toBeDefined();
    expect(lossRatio!.value).toBeCloseTo(70, 1);
  });

  it("calculates combined ratio", () => {
    const raw = [
      makeMetric("losses_incurred", 650e6),
      makeMetric("net_premiums_earned", 1000e6),
      makeMetric("acquisition_costs", 150e6),
      makeMetric("underwriting_expenses", 100e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual", "P&C");
    const combined = derived.find((d) => d.metric_name === "combined_ratio");
    expect(combined).toBeDefined();
    expect(combined!.value).toBeCloseTo(90, 1);
  });

  it("skips underwriting ratios for non-P&C/Reinsurance sectors", () => {
    const raw = [
      makeMetric("losses_incurred", 700e6),
      makeMetric("net_premiums_earned", 1000e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual", "Life");
    expect(derived.find((d) => d.metric_name === "loss_ratio")).toBeUndefined();
  });

  it("calculates ROE", () => {
    const raw = [
      makeMetric("net_income", 500e6),
      makeMetric("stockholders_equity", 5000e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual");
    const roe = derived.find((d) => d.metric_name === "roe");
    expect(roe).toBeDefined();
    expect(roe!.value).toBeCloseTo(10, 1);
  });

  it("calculates ROA", () => {
    const raw = [
      makeMetric("net_income", 200e6),
      makeMetric("total_assets", 10000e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual");
    const roa = derived.find((d) => d.metric_name === "roa");
    expect(roa).toBeDefined();
    expect(roa!.value).toBeCloseTo(2, 1);
  });

  it("calculates book value per share", () => {
    const raw = [
      makeMetric("stockholders_equity", 10e9),
      makeMetric("shares_outstanding", 500e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual");
    const bvps = derived.find((d) => d.metric_name === "book_value_per_share");
    expect(bvps).toBeDefined();
    expect(bvps!.value).toBeCloseTo(20, 1);
  });

  it("calculates debt-to-equity", () => {
    const raw = [
      makeMetric("total_debt", 3e9),
      makeMetric("stockholders_equity", 10e9),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual");
    const dte = derived.find((d) => d.metric_name === "debt_to_equity");
    expect(dte).toBeDefined();
    expect(dte!.value).toBeCloseTo(0.3, 2);
  });

  it("calculates MLR for Health using premiums denominator", () => {
    const raw = [
      makeMetric("medical_claims_expense", 850e6),
      makeMetric("net_premiums_earned", 1000e6),
      makeMetric("revenue", 5000e6), // PBM revenue inflates this
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual", "Health");
    const mlr = derived.find((d) => d.metric_name === "medical_loss_ratio");
    expect(mlr).toBeDefined();
    // Should use net_premiums_earned (1B), not revenue (5B)
    expect(mlr!.value).toBeCloseTo(85, 1);
  });

  it("skips MLR for non-Health sectors", () => {
    const raw = [
      makeMetric("medical_claims_expense", 850e6),
      makeMetric("net_premiums_earned", 1000e6),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual", "P&C");
    expect(
      derived.find((d) => d.metric_name === "medical_loss_ratio")
    ).toBeUndefined();
  });

  it("avoids division by zero", () => {
    const raw = [
      makeMetric("net_income", 500e6),
      makeMetric("stockholders_equity", 0),
    ];
    const derived = calculateDerivedMetrics(raw, 2023, null, "annual");
    expect(derived.find((d) => d.metric_name === "roe")).toBeUndefined();
  });
});

describe("calculateYoyGrowth", () => {
  it("calculates premium growth YoY", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior);
    const g = growth.find((d) => d.metric_name === "premium_growth_yoy");
    expect(g).toBeDefined();
    expect(g!.value).toBeCloseTo(10, 1);
  });

  it("returns empty when prior is missing", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const growth = calculateYoyGrowth(current, []);
    expect(growth).toHaveLength(0);
  });

  it("handles negative growth", () => {
    const current = [makeMetric("net_premiums_earned", 900e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior);
    expect(growth[0].value).toBeCloseTo(-10, 1);
  });

  it("computes growth for P&C sector", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior, "P&C");
    expect(growth).toHaveLength(1);
    expect(growth[0].value).toBeCloseTo(10, 1);
  });

  it("computes growth for Reinsurance sector", () => {
    const current = [makeMetric("net_premiums_earned", 1200e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior, "Reinsurance");
    expect(growth).toHaveLength(1);
  });

  it("skips growth for Brokers sector", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior, "Brokers");
    expect(growth).toHaveLength(0);
  });

  it("skips growth for Life sector", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior, "Life");
    expect(growth).toHaveLength(0);
  });

  it("skips growth for Health sector", () => {
    const current = [makeMetric("net_premiums_earned", 1100e6)];
    const prior = [
      makeMetric("net_premiums_earned", 1000e6, { fiscal_year: 2022 }),
    ];
    const growth = calculateYoyGrowth(current, prior, "Health");
    expect(growth).toHaveLength(0);
  });
});
