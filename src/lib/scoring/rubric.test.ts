import { describe, expect, it } from "vitest";
import { RUBRIC_KEYS, RUBRIC_WEIGHTS, weightedOverall } from "./rubric";

describe("rubric", () => {
  it("weights sum to one", () => {
    const sum = RUBRIC_KEYS.reduce((a, k) => a + RUBRIC_WEIGHTS[k], 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1);
  });
  it("weighted overall of all 8s is 8", () => {
    const d = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, { score: 8 }])) as Record<(typeof RUBRIC_KEYS)[number], { score: number }>;
    expect(weightedOverall(d)).toBe(8);
  });
  it("close and reason for call move the overall more than value prop", () => {
    const base = Object.fromEntries(RUBRIC_KEYS.map((k) => [k, { score: 5 }])) as Record<(typeof RUBRIC_KEYS)[number], { score: number }>;
    const a = weightedOverall({ ...base, close: { score: 10 } });
    const b = weightedOverall({ ...base, value_prop: { score: 10 } });
    expect(a).toBeGreaterThan(b);
  });
});
