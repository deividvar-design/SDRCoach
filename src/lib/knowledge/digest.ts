import "server-only";
import { NO_DASHES_RULE, withoutLongDashes } from "@/lib/text/dashes";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { anthropicCost } from "@/lib/usage/pricing";
import { reportError } from "@/lib/sentry";

export const DIGEST_MODEL = "claude-opus-5";

/**
 * How many digests a workspace may start. Each one is a large request to the strongest model, so the limit is on
 * attempts, counted from usage rows written before the request goes out. Counting the sources a workspace holds
 * would not do: deleting a source, or retrying a failed one, would hand the allowance back.
 */
export const DIGESTS_PER_DAY = 30;
export const TRIAL_DIGESTS_TOTAL = 25;

const DigestSchema = z.object({
  summary: z.string().describe("Two sentences: what this material is and what it teaches"),
  prospect_tone: z.string().describe("How prospects in these calls talk: pace, formality, patience, typical mood"),
  common_objections: z
    .array(
      z.object({
        objection: z.string(),
        example_phrasing: z.string().describe("Verbatim or near-verbatim how a prospect said it"),
        best_response_seen: z.string().describe("The strongest rep response in the material, or 'none seen'"),
      }),
    )
    .max(10),
  what_worked: z.array(z.string()).max(8).describe("Rep behaviours that led to a meeting or a warmer prospect"),
  what_failed: z.array(z.string()).max(8).describe("Rep behaviours that lost the prospect"),
  vocabulary: z.array(z.string()).max(12).describe("Industry terms, product names, and phrases prospects use"),
});

export type KnowledgeDigest = z.infer<typeof DigestSchema>;

// A large source is a long request: give it four minutes (the knowledge page allows five) and no automatic retry,
// so one attempt in the allowance is one request paid for.
const client = new Anthropic({ timeout: 240_000, maxRetries: 0 });

/** Digest one knowledge source with Claude and store the result. Safe to re-run. */
export async function digestKnowledgeSource(id: string) {
  const db = createAdminClient();
  const { data: source } = await db.from("knowledge_sources").select("id, org_id, name, kind, raw_text").eq("id", id).single();
  if (!source?.raw_text) return;

  // The allowance, checked here so every way in (add, upload, retry) meets it.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const attempts = () => db.from("usage_events").select("id", { count: "exact", head: true }).eq("org_id", source.org_id).eq("kind", "digest");
  const [{ data: org }, { count: today }, { count: ever }] = await Promise.all([db.from("organizations").select("plan").eq("id", source.org_id).single(), attempts().gte("created_at", since), attempts()]);
  const overDay = (today ?? 0) >= DIGESTS_PER_DAY;
  const overTrial = org?.plan === "trial" && (ever ?? 0) >= TRIAL_DIGESTS_TOTAL;
  if (overDay || overTrial) {
    await db
      .from("knowledge_sources")
      .update({ status: "failed", error: overTrial ? "This trial has used its knowledge reads. Upgrade to add more." : "Today's limit for reading new sources is reached. Try again tomorrow." })
      .eq("id", id);
    return;
  }
  // Count the attempt before spending anything; the real numbers are filled in when the answer comes back.
  const { data: attempt, error: attemptError } = await db
    .from("usage_events")
    .insert({ org_id: source.org_id, provider: "anthropic", kind: "digest", model: DIGEST_MODEL, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, cost_usd: 0 })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    // Without the count there is no limit, so do not run.
    await db.from("knowledge_sources").update({ status: "failed", error: "Could not start reading this source. Try again." }).eq("id", id);
    throw new Error(attemptError?.message ?? "digest attempt not recorded");
  }

  await db.from("knowledge_sources").update({ status: "processing", error: null }).eq("id", id);

  try {
    // Keep the request bounded; very long uploads are truncated at a sentence boundary with a note.
    const MAX = 350_000;
    const text = source.raw_text.length > MAX ? `${source.raw_text.slice(0, MAX)}\n\n[truncated: ${source.raw_text.length - MAX} more characters]` : source.raw_text;

    const response = await client.messages.parse({
      model: DIGEST_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system:
        "You analyse real B2B cold-call material (transcripts, scripts, playbooks, objection sheets) for a sales training tool. Extract what an AI prospect would need to sound like the real buyers in this market, and what a coach would need to grade reps against this team's playbook. Be concrete and quote real phrasing. Ignore anything that is not about selling conversations. " + NO_DASHES_RULE,
      messages: [{ role: "user", content: `Material name: ${source.name}\nType: ${source.kind}\n\n${text}` }],
      output_config: { format: zodOutputFormat(DigestSchema), effort: "medium" },
    });

    const parsed = response.parsed_output && withoutLongDashes(response.parsed_output);
    if (!parsed) throw new Error("no parseable digest");

    await db.from("knowledge_sources").update({ status: "ready", summary: parsed.summary, extracted: parsed }).eq("id", id);
    const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, cache_read_tokens: response.usage.cache_read_input_tokens ?? 0, cache_write_tokens: response.usage.cache_creation_input_tokens ?? 0 };
    const { error: usageError } = await db.from("usage_events").update({ model: response.model, ...usage, cost_usd: anthropicCost(response.model, usage) }).eq("id", attempt.id);
    if (usageError) reportError(new Error(usageError.message), { where: "usage_record_digest", orgId: source.org_id });
  } catch (err) {
    await db
      .from("knowledge_sources")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", id);
    throw err;
  }
}

/** Ready digests for an org, newest first. Used by persona prompts and the grader. */
export async function loadOrgDigests(orgId: string, limit = 5): Promise<KnowledgeDigest[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("knowledge_sources")
    .select("extracted")
    .eq("org_id", orgId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.extracted).filter((e): e is KnowledgeDigest => !!e && typeof e === "object" && "common_objections" in (e as object));
}
