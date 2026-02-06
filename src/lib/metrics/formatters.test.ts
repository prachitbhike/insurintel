import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatPerShare,
  formatNumber,
  formatChangePct,
  getTrendDirection,
} from "./formatters";

describe("formatCurrency", () => {
  it("formats trillions", () => {
    expect(formatCurrency(1.5e12)).toBe("$1,500.0T");
  });

  it("formats billions", () => {
    expect(formatCurrency(45.3e9)).toBe("$45.3B");
  });

  it("formats millions", () => {
    expect(formatCurrency(123.4e6)).toBe("$123.4M");
  });

  it("formats thousands", () => {
    expect(formatCurrency(5600)).toBe("$5.6K");
  });

  it("formats small values", () => {
    expect(formatCurrency(42)).toBe("$42");
  });

  it("handles negatives", () => {
    expect(formatCurrency(-2.1e9)).toBe("-$2.1B");
  });
});

describe("formatPercent", () => {
  it("formats with default 1 decimal", () => {
    expect(formatPercent(95.23)).toBe("95.2%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(95.237, 2)).toBe("95.24%");
  });
});

describe("formatRatio", () => {
  it("formats with default 2 decimals", () => {
    expect(formatRatio(1.5)).toBe("1.50x");
  });
});

describe("formatPerShare", () => {
  it("formats as dollar amount", () => {
    expect(formatPerShare(123.456)).toBe("$123.46");
  });
});

describe("formatNumber", () => {
  it("formats billions", () => {
    expect(formatNumber(2.5e9)).toBe("2.5B");
  });

  it("formats millions", () => {
    expect(formatNumber(750e6)).toBe("750.0M");
  });
});

describe("formatChangePct", () => {
  it("returns N/A for null", () => {
    expect(formatChangePct(null)).toBe("N/A");
  });

  it("adds + for positive", () => {
    expect(formatChangePct(5.3)).toBe("+5.3%");
  });

  it("adds - for negative", () => {
    expect(formatChangePct(-2.1)).toBe("-2.1%");
  });
});

describe("getTrendDirection", () => {
  it("returns neutral for zero change", () => {
    expect(getTrendDirection("roe", 0)).toBe("neutral");
  });

  it("returns neutral for null", () => {
    expect(getTrendDirection("roe", null)).toBe("neutral");
  });

  it("returns positive for increase in higher_is_better metric", () => {
    expect(getTrendDirection("roe", 5)).toBe("positive");
  });

  it("returns positive for decrease in lower_is_better metric", () => {
    expect(getTrendDirection("loss_ratio", -3)).toBe("positive");
  });

  it("returns negative for increase in lower_is_better metric", () => {
    expect(getTrendDirection("loss_ratio", 3)).toBe("negative");
  });
});
