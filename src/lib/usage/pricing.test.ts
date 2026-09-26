import { describe, expect, it } from "vitest";
import { anthropicCost, voiceCost, formatUsd } from "./pricing";

describe("pricing", () => {
  it("prices opus tokens including cache", () => {
    expect(anthropicCost("claude-opus-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBe(5);
    expect(anthropicCost("claude-opus-5", { input_tokens: 0, output_tokens: 100_000, cache_read_tokens: 1_000_000 })).toBe(3);
  });
  it("falls back to opus pricing for unknown models", () => {
    expect(anthropicCost("claude-future-9", { input_tokens: 1_000_000, output_tokens: 0 })).toBe(5);
  });
  it("prices voice per minute", () => {
    expect(voiceCost(300, 0.1)).toBe(0.5);
  });
  it("formats", () => {
    expect(formatUsd(0.456)).toBe("$0.46");
    expect(formatUsd(1234)).toBe("$1,234");
  });
});
