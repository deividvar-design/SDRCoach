import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { anthropicCost, voiceCost, type TokenUsage } from "./pricing";
import { reportError } from "@/lib/sentry";

type Db = SupabaseClient<Database>;

export async function recordAnthropicUsage(db: Db, p: { orgId: string; sessionId?: string | null; kind: "score" | "digest"; model: string; usage: TokenUsage }) {
  const { error } = await db.from("usage_events").insert({
    org_id: p.orgId,
    session_id: p.sessionId ?? null,
    provider: "anthropic",
    kind: p.kind,
    model: p.model,
    input_tokens: p.usage.input_tokens,
    output_tokens: p.usage.output_tokens,
    cache_read_tokens: p.usage.cache_read_tokens ?? 0,
    cache_write_tokens: p.usage.cache_write_tokens ?? 0,
    cost_usd: anthropicCost(p.model, p.usage),
  });
  if (error) reportError(new Error(error.message), { where: "usage_record_anthropic", orgId: p.orgId, sessionId: p.sessionId });
}

export async function recordVoiceUsage(db: Db, p: { orgId: string; sessionId: string; seconds: number }) {
  const { error } = await db.from("usage_events").insert({
    org_id: p.orgId,
    session_id: p.sessionId,
    provider: "elevenlabs",
    kind: "voice",
    seconds: p.seconds,
    cost_usd: voiceCost(p.seconds),
  });
  // 23505: a voice row already exists for this session (re-finalize). Never count minutes twice.
  if (error && error.code !== "23505") reportError(new Error(error.message), { where: "usage_record_voice", orgId: p.orgId, sessionId: p.sessionId });
}
