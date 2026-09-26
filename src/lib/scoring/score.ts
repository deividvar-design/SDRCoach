import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { LEVELS } from "@/lib/domain/levels";
import type { CallMetrics, CallOutcome, Difficulty, ScoreDimensions, TranscriptTurn } from "@/types/database";
import { RUBRIC, RUBRIC_KEYS, RUBRIC_WEIGHTS } from "./rubric";
import type { KnowledgeDigest } from "@/lib/knowledge/digest";

export const SCORING_MODEL = "claude-opus-5";

const dimension = z.object({
  score: z.number().min(0).max(10).describe("0–10, one decimal allowed"),
  rationale: z.string().describe("One or two sentences quoting or paraphrasing what the rep actually said"),
});

const ScoreSchema = z.object({
  opener: dimension,
  reason_for_call: dimension,
  discovery: dimension,
  objection_handling: dimension,
  value_prop: dimension,
  close: dimension,
  strengths: z.array(z.string()).min(1).max(3).describe("Specific things the rep did well, each citing a moment"),
  improvements: z.array(z.string()).min(1).max(3).describe("The highest-leverage changes, phrased as what to do next time, each citing a moment"),
  coach_summary: z.string().describe("Three to five sentences a good sales manager would say to this rep right after the call. Direct, warm, specific. Second person."),
  moments: z
    .array(
      z.object({
        t_ms: z.number().describe("Timestamp of the turn this refers to, from the transcript"),
        label: z.string().describe("Short label, max 8 words"),
        kind: z.enum(["good", "missed"]),
      }),
    )
    .max(6),
  inferred_outcome: z
    .enum(["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"])
    .describe("What the prospect decided, judged strictly from the prospect's own words at the end of the call"),
  outcome_reason: z.string().describe("One sentence, from the prospect's point of view, on why they decided that"),
});

export type ScoreResult = z.infer<typeof ScoreSchema>;

export interface ScoreInput {
  turns: TranscriptTurn[];
  metrics: CallMetrics;
  difficulty: Difficulty;
  prospect: { name: string; title: string; company: string };
  repName: string;
  orgPlaybook: KnowledgeDigest[];
  durationSecs: number;
}

function renderTranscript(turns: TranscriptTurn[], repName: string, prospectName: string) {
  return turns
    .map((t) => {
      const ts = typeof t.t_start_ms === "number" ? `[${Math.floor(t.t_start_ms / 60000)}:${String(Math.floor((t.t_start_ms % 60000) / 1000)).padStart(2, "0")}] ` : "";
      return `${ts}${t.role === "rep" ? repName : prospectName}: ${t.text}`;
    })
    .join("\n");
}

export function weightedOverall(d: ScoreDimensions) {
  const total = RUBRIC_KEYS.reduce((acc, k) => acc + d[k].score * RUBRIC_WEIGHTS[k], 0);
  return Math.round(total * 10) / 10;
}

const client = new Anthropic();

export async function scoreCall(input: ScoreInput) {
  const level = LEVELS[input.difficulty];
  const playbook = input.orgPlaybook.length
    ? `\n\n## This team's playbook (from their real calls)\nWhat has worked for them: ${input.orgPlaybook.flatMap((d) => d.what_worked).slice(0, 8).join("; ")}\nWhat has hurt them: ${input.orgPlaybook.flatMap((d) => d.what_failed).slice(0, 6).join("; ")}`
    : "";

  const system = `You are an elite SDR coach grading a simulated cold call. The prospect was an AI roleplaying ${input.prospect.name}, ${input.prospect.title} at ${input.prospect.company}, at difficulty Level ${level.level} (${level.name}: ${level.tagline}). Grade only the rep. The prospect's behaviour is not under review.

Score each rubric dimension from 0 to 10 using these definitions:
${RUBRIC_KEYS.map((k) => `- ${k}: ${RUBRIC[k].description}`).join("\n")}

Calibration: 5 is an average new SDR. 7 is a solid rep who would book meetings at a normal rate. 9+ is rare and requires the rep to have done that dimension near-perfectly for this call. Score a dimension low if the rep never attempted it (for example no close at all is a 1, not a 5). Do not inflate. Be specific: every rationale must reference something the rep said or failed to say. If the call was very short or the prospect hung up early, judge what was attempted and mark untouched dimensions low with a one-line explanation.

The outcome is decided by the prospect, not the rep. Infer it strictly from the prospect's final words.${playbook}`;

  const user = `## Call
Rep: ${input.repName}
Duration: ${Math.round(input.durationSecs)}s
Computed stats: rep talk ratio ${Math.round(input.metrics.rep_talk_ratio * 100)}%, longest rep monologue ${input.metrics.longest_rep_monologue_secs}s, rep asked ${input.metrics.rep_questions} questions, ${input.metrics.filler_words} filler words, first objection at ${input.metrics.first_objection_secs ?? "n/a"}s, rep interrupted the prospect ${input.metrics.interruptions_by_rep} times.

## Transcript
${renderTranscript(input.turns, input.repName, input.prospect.name)}`;

  const response = await client.messages.parse({
    model: SCORING_MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(ScoreSchema), effort: "medium" },
  });

  if (response.stop_reason === "refusal") throw new Error("scoring refused");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("scoring returned no parseable output");

  const dimensions: ScoreDimensions = {
    opener: parsed.opener,
    reason_for_call: parsed.reason_for_call,
    discovery: parsed.discovery,
    objection_handling: parsed.objection_handling,
    value_prop: parsed.value_prop,
    close: parsed.close,
  };

  return {
    dimensions,
    overall: weightedOverall(dimensions),
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    coach_summary: parsed.coach_summary,
    moments: parsed.moments,
    inferred_outcome: parsed.inferred_outcome as CallOutcome,
    outcome_reason: parsed.outcome_reason,
    model: response.model,
  };
}
