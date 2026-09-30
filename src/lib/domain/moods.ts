import type { Difficulty } from "@/types/database";
import { VOICES, voiceById } from "@/lib/domain/voices";

/** Background sound bed the browser mixes under the prospect's voice. Generated procedurally; no audio files. */
export type Ambience = "quiet" | "office" | "car" | "street" | "home";

export interface Mood {
  id: string;
  /** Shown on the report. */
  label: string;
  /** Injected into the prospect prompt. */
  prompt: string;
  ambience: Ambience;
  /** Levels this mood can roll on. */
  levels: Difficulty[];
  weight: number;
}

const ALL: Difficulty[] = ["warm", "inbound", "cold"];

/**
 * Dice rolled once per call. The level sets how much resistance the prospect gives; the mood sets the texture,
 * so the same target is never the same person twice and reps train the skill rather than the persona.
 */
export const MOODS: Mood[] = [
  { id: "plain", label: "At their desk", prompt: "You are at your desk on a normal day. Nothing special is going on.", ambience: "office", levels: ALL, weight: 3 },
  { id: "meeting", label: "Between meetings", prompt: "You have four minutes before your next meeting and you keep glancing at the clock. Curt, not rude. Say early that you have to be quick, and mean it.", ambience: "office", levels: ALL, weight: 2 },
  { id: "car", label: "In the car", prompt: "You are driving, on hands-free. Short answers, the odd pause while you deal with traffic. You will not write anything down, so anything they want to send has to come by email, and you will not agree a time without your calendar.", ambience: "car", levels: ALL, weight: 2 },
  { id: "street", label: "On the street", prompt: "You are walking between buildings, outside, a bit distracted. Ask them to repeat something once. You are open to a quick chat but not a long one.", ambience: "street", levels: ["warm", "inbound"], weight: 1 },
  { id: "home", label: "Working from home", prompt: "You are at home. A dog or a child is somewhere in the background and may pull your attention for a second. Relaxed, but you want to keep it short.", ambience: "home", levels: ALL, weight: 2 },
  { id: "bad_quarter", label: "Rough quarter", prompt: "Your numbers are bad this quarter and your boss is on you. Anything that costs money gets a hard no unless it clearly saves more or fixes the thing that is hurting you right now. If the rep finds that thing, you are more open than usual.", ambience: "office", levels: ["inbound", "cold"], weight: 2 },
  { id: "expecting", label: "Expecting another call", prompt: "You picked up thinking this was a call you were waiting for. Your first reaction is disappointment, and you say so. It takes a good reason for calling to keep you on the line.", ambience: "office", levels: ["warm", "cold"], weight: 1 },
  { id: "chatty", label: "Unusually chatty", prompt: "You are in a good mood and inclined to talk. You still will not commit to anything you have not been convinced of, but you give the rep more rope and tell them more about your world if they ask.", ambience: "office", levels: ["warm", "inbound"], weight: 1 },
  { id: "burned", label: "Burned by a vendor", prompt: "You switched vendors in this area last year and it went badly: missed deadlines, a migration that dragged on. You are suspicious of anyone promising a smooth switch, and you say why.", ambience: "office", levels: ["inbound", "cold"], weight: 2 },
];

export const moodById = (id: string | null | undefined) => MOODS.find((m) => m.id === id) ?? null;

export function rollMood(difficulty: Difficulty, rand = Math.random): Mood {
  const pool = MOODS.filter((m) => m.levels.includes(difficulty));
  const total = pool.reduce((n, m) => n + m.weight, 0);
  let r = rand() * total;
  for (const m of pool) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return pool[0]!;
}

/** Share of cold calls that an assistant or receptionist answers first. Other levels never have one. */
const GATEKEEPER_RATE: Record<Difficulty, number> = { warm: 0, inbound: 0, cold: 0.35 };

export function rollGatekeeper(difficulty: Difficulty, rand = Math.random) {
  return rand() < GATEKEEPER_RATE[difficulty];
}

/**
 * Voices the agent may switch to mid-call. They live in the agent's static config (the browser may only override
 * the main voice), so the labels here must match `scripts/elevenlabs-update.mjs`.
 */
export const GATEKEEPER_VOICES = [
  { label: "Receptionist", voiceId: "21m00Tcm4TlvDq8ikWAM", gender: "woman", names: ["Emma", "Laura", "Priya", "Sophie"] },
  { label: "Assistant", voiceId: "TxGEqnHWrfWFTfGW9XjX", gender: "man", names: ["Tom", "Marcus", "Ben", "Arjun"] },
] as const;

export interface Gatekeeper {
  name: string;
  /** Voice label the prompt tells the model to switch to. */
  voiceLabel: string;
  role: "assistant" | "receptionist";
}

/** A gatekeeper of the other gender to the prospect's voice, so the switch is audible. */
export function pickGatekeeper(prospectVoiceId: string | null | undefined, rand = Math.random): Gatekeeper {
  const prospectGender = (voiceById(prospectVoiceId) ?? VOICES[0]).gender;
  const pool = GATEKEEPER_VOICES.filter((g) => g.gender !== prospectGender);
  const g = pool[Math.floor(rand() * pool.length)] ?? GATEKEEPER_VOICES[0];
  return { name: g.names[Math.floor(rand() * g.names.length)]!, voiceLabel: g.label, role: rand() < 0.5 ? "assistant" : "receptionist" };
}
