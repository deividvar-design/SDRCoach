import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAnthropicUsage } from "@/lib/usage/record";

export const DIGEST_MODEL = "claude-opus-5";

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

const client = new Anthropic();

/** Digest one knowledge source with Claude and store the result. Safe to re-run. */
export async function digestKnowledgeSource(id: string) {
  const db = createAdminClient();
  const { data: source } = await db.from("knowledge_sources").select("id, org_id, name, kind, raw_text").eq("id", id).single();
  if (!source?.raw_text) return;

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
        "You analyse real B2B cold-call material (transcripts, scripts, playbooks, objection sheets) for a sales training tool. Extract what an AI prospect would need to sound like the real buyers in this market, and what a coach would need to grade reps against this team's playbook. Be concrete and quote real phrasing. Ignore anything that is not about selling conversations.",
      messages: [{ role: "user", content: `Material name: ${source.name}\nType: ${source.kind}\n\n${text}` }],
      output_config: { format: zodOutputFormat(DigestSchema), effort: "medium" },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("no parseable digest");

    await db.from("knowledge_sources").update({ status: "ready", summary: parsed.summary, extracted: parsed }).eq("id", id);
    await recordAnthropicUsage(db, {
      orgId: source.org_id,
      kind: "digest",
      model: response.model,
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, cache_read_tokens: response.usage.cache_read_input_tokens ?? 0, cache_write_tokens: response.usage.cache_creation_input_tokens ?? 0 },
    });
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
