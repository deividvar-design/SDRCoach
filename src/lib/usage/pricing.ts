/**
 * Estimated unit costs for the admin console. Not billing-grade: providers change prices and the
 * voice rate depends on plan. Update here when a price changes.
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
}

/** USD per million tokens. */
const ANTHROPIC: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export function anthropicCost(model: string, u: TokenUsage) {
  const key = Object.keys(ANTHROPIC).find((k) => model.startsWith(k));
  const p = key ? ANTHROPIC[key]! : ANTHROPIC["claude-opus-5"]!;
  const usd =
    (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_read_tokens ?? 0) * p.cacheRead + (u.cache_write_tokens ?? 0) * p.cacheWrite) / 1_000_000;
  return Math.round(usd * 100000) / 100000;
}

/** Conversational voice, USD per minute, overridable per deployment. */
export function voiceCost(seconds: number, perMinute = Number(process.env.ELEVENLABS_COST_PER_MIN ?? 0.1)) {
  return Math.round((seconds / 60) * perMinute * 100000) / 100000;
}

export function formatUsd(v: number) {
  return v >= 100 ? `$${Math.round(v).toLocaleString()}` : `$${v.toFixed(2)}`;
}
