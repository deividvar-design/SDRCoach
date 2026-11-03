import { describe, expect, it } from "vitest";
import { DEFAULT_CONSTANTS, DEFAULT_INPUTS, calculate, roundMoney } from "./calculator";

describe("pricing calculator", () => {
  it("reproduces the worked default from the pricing doc", () => {
    const r = calculate(DEFAULT_INPUTS, DEFAULT_CONSTANTS, 49);
    expect(r.dialsPerMonth).toBe(6300);
    expect(r.conversations).toBe(441);
    expect(r.costPerDial).toBeCloseTo(6.85, 2);
    expect(r.costPerConversation).toBe(98);
    expect(r.atRisk).toBe(176);
    expect(r.burned).toBe(17300);
    expect(r.price).toBe(245);
    expect(r.ratio).toBe(3);
    expect(r.priceExceedsRisk).toBe(false);
  });
  it("keeps the guard rails: never negative, capped at $500k, ratio never below one", () => {
    expect(roundMoney(-5)).toBe(0);
    expect(roundMoney(9_999_999)).toBe(500_000);
    expect(roundMoney(1234)).toBe(1200);
    expect(roundMoney(999)).toBe(999);
    const tiny = calculate({ reps: 1, dialsPerDay: 200, connectRate: 0.25 }, DEFAULT_CONSTANTS, 49);
    expect(tiny.ratio).toBeGreaterThanOrEqual(1);
    expect(tiny.burned).toBeGreaterThanOrEqual(0);
  });
});
