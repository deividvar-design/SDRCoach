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

export interface FetchedTurn {
  role: "rep" | "prospect";
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
}

/**
 * Fetch a finished conversation. ElevenLabs takes a few seconds after hang-up to run analysis,
 * so poll briefly for `done` before giving up and using whatever transcript exists.
 */
export async function fetchConversation(conversationId: string, { attempts = 8, delayMs = 2500 } = {}): Promise<FetchedConversation> {
  let last: Awaited<ReturnType<ReturnType<typeof elevenlabs>["conversationalAi"]["conversations"]["get"]>> | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await elevenlabs().conversationalAi.conversations.get(conversationId);
    if (last.status === "done" || last.status === "failed") break;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  if (!last) throw new Error("conversation fetch failed");

  const turns: FetchedTurn[] = last.transcript
    .filter((t) => (t.message ?? "").trim().length > 0)
    .map((t) => ({
      role: t.role === "agent" ? "prospect" : "rep",
      text: (t.message ?? "").trim(),
      t_start_ms: Math.round(t.timeInCallSecs * 1000),
      interrupted: Boolean(t.interrupted),
    }));

  const dataCollection: Record<string, unknown> = {};
  for (const [key, r] of Object.entries(last.analysis?.dataCollectionResults ?? {})) dataCollection[key] = r.value;

  return {
    status: last.status,
    durationSecs: last.metadata.callDurationSecs,
    turns,
    summary: last.analysis?.transcriptSummary ?? null,
    dataCollection,
  };
}
