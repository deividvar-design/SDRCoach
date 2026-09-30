import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let cached: ElevenLabsClient | null = null;

export function elevenlabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  cached ??= new ElevenLabsClient({ apiKey });
  return cached;
}

export function agentId() {
  const id = process.env.ELEVENLABS_AGENT_ID;
  if (!id) throw new Error("ELEVENLABS_AGENT_ID is not set. Run `pnpm elevenlabs:setup` once and copy the id into your env.");
  return id;
}

/** Mint a short-lived WebRTC token so the browser can join without ever seeing the API key. */
export async function mintConversationToken() {
  const res = await elevenlabs().conversationalAi.conversations.getWebrtcToken({ agentId: agentId() });
  return res.token;
}

import { stripVoiceTags } from "@/lib/elevenlabs/tags";
export { stripVoiceTags };

export interface FetchedTurn {
  role: "rep" | "prospect";
  speaker?: "gatekeeper";
  text: string;
  t_start_ms: number;
  interrupted: boolean;
}

export interface FetchedConversation {
  status: string;
  durationSecs: number;
  turns: FetchedTurn[];
  summary: string | null;
  dataCollection: Record<string, unknown>;
  /** The prompt override the browser sent when it joined, so the server can check it was not tampered with. */
  overridePrompt: string | null;
}

/**
 * Fetch a finished conversation. ElevenLabs takes a few seconds after hang-up to run analysis,
 * so poll for `done` (up to a minute) before giving up and using whatever transcript exists.
 */
export async function fetchConversation(conversationId: string, { attempts = 20, delayMs = 3000 } = {}): Promise<FetchedConversation> {
  let last: Awaited<ReturnType<ReturnType<typeof elevenlabs>["conversationalAi"]["conversations"]["get"]>> | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await elevenlabs().conversationalAi.conversations.get(conversationId);
    if (last.status === "done" || last.status === "failed") break;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  if (!last) throw new Error("conversation fetch failed");

  // A multi-voice turn (gatekeeper then prospect in one breath) arrives as parts with voice labels; split it so the
  // transcript, metrics and grader see who actually spoke.
  const turns: FetchedTurn[] = last.transcript.flatMap((t) => {
    const startMs = Math.round(t.timeInCallSecs * 1000);
    const parts = t.role === "agent" && t.multivoiceMessage?.parts?.length ? t.multivoiceMessage.parts : null;
    if (parts) {
      return parts
        .map((p) => ({ text: stripVoiceTags(p.text), label: p.voiceLabel, at: typeof p.timeInCallSecs === "number" ? Math.round(p.timeInCallSecs * 1000) : startMs }))
        .filter((p) => p.text.length > 0)
        .map((p) => ({ role: "prospect" as const, ...(p.label ? { speaker: "gatekeeper" as const } : {}), text: p.text, t_start_ms: p.at, interrupted: Boolean(t.interrupted) }));
    }
    const raw = t.message ?? "";
    const text = stripVoiceTags(raw);
    if (!text) return [];
    const tagged = t.role === "agent" && /<[A-Za-z]+>/.test(raw);
    return [{ role: t.role === "agent" ? ("prospect" as const) : ("rep" as const), ...(tagged ? { speaker: "gatekeeper" as const } : {}), text, t_start_ms: startMs, interrupted: Boolean(t.interrupted) }];
  });

  const dataCollection: Record<string, unknown> = {};
  for (const [key, r] of Object.entries(last.analysis?.dataCollectionResults ?? {})) dataCollection[key] = r.value;

  return {
    status: last.status,
    durationSecs: last.metadata.callDurationSecs,
    turns,
    summary: last.analysis?.transcriptSummary ?? null,
    dataCollection,
    overridePrompt: last.conversationInitiationClientData?.conversationConfigOverride?.agent?.prompt?.prompt ?? null,
  };
}
