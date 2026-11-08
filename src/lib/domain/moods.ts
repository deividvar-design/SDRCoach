import type { Difficulty } from "@/types/database";
import { VOICES, voiceById } from "@/lib/domain/voices";

/** Background sound bed the browser mixes under the prospect's voice. Generated procedurally; no audio files. */
export type Ambience = "quiet" | "office" | "open_office" | "car" | "street" | "home" | "cafe" | "station";

export interface Mood {
  id: string;
  /** Shown on the report. */
  label: string;
  /** Injected into the prospect prompt. */
  prompt: string;
  ambience: Ambience;
}

const ALL: Difficulty[] = ["warm", "inbound", "cold"];

interface Die {
  id: string;
  label: string;
  prompt: string;
  levels: Difficulty[];
  weight: number;
}

/** Where the prospect is when they pick up. Sets the sound bed and what they can and cannot do on the call. */
export const SETTINGS: (Die & { ambience: Ambience })[] = [
  { id: "desk", label: "At their desk", prompt: "You are at your desk in your own office.", ambience: "office", levels: ALL, weight: 3 },
  { id: "open_office", label: "In an open-plan office", prompt: "You are at your desk in a busy open-plan office. Colleagues talk nearby and you keep your voice down a little.", ambience: "open_office", levels: ALL, weight: 2 },
  { id: "car", label: "In the car", prompt: "You are driving, on hands-free. Short answers, the odd pause while you deal with traffic. You cannot write anything down or look at your calendar: if you agree to a meeting, take the time they propose provisionally and ask them to send the invite so you can confirm it later.", ambience: "car", levels: ALL, weight: 2 },
  { id: "street", label: "Walking in the city", prompt: "You are walking between buildings in the city, a bit distracted by the traffic. Ask them to repeat something once. A quick chat is fine, a long one is not.", ambience: "street", levels: ALL, weight: 2 },
  { id: "home", label: "Working from home", prompt: "You are at home. A dog or a child is somewhere in the background and may pull your attention for a second.", ambience: "home", levels: ALL, weight: 2 },
  { id: "cafe", label: "In a café", prompt: "You are in a café grabbing a coffee between things. It is noisy around you, so you lean in to hear, and you will not stay on for long.", ambience: "cafe", levels: ALL, weight: 1 },
  { id: "station", label: "At a train station", prompt: "You are at a train station and your train leaves in a few minutes. If an announcement plays, pause for a second to listen before you carry on.", ambience: "station", levels: ALL, weight: 1 },
];

/** How the prospect's day is going. Rolled separately, so any temperament can turn up in any place. */
export const TEMPERS: Die[] = [
  { id: "neutral", label: "Normal day", prompt: "Nothing special is going on. A normal day.", levels: ALL, weight: 4 },
  { id: "rushed", label: "Short on time", prompt: "You have four minutes before your next thing and you keep checking the time. Curt, not rude. Say early that you have to be quick, and mean it.", levels: ALL, weight: 2 },
  { id: "distracted", label: "Distracted", prompt: "You are half reading an email while you talk. Your first answers are short and a beat late. You engage properly once the rep says something specific to you.", levels: ALL, weight: 1 },
  { id: "bad_quarter", label: "Rough quarter", prompt: "Your numbers are bad this quarter and your boss is on you. Anything that costs money gets a hard no unless it clearly saves more or fixes the thing that is hurting you right now. If the rep finds that thing, you are more open than usual.", levels: ["inbound", "cold"], weight: 2 },
  { id: "expecting", label: "Expecting another call", prompt: "You picked up thinking this was a call you were waiting for. Your first reaction is disappointment, and you say so. It takes a good reason for calling to keep you on the line.", levels: ["warm", "cold"], weight: 1 },
  { id: "chatty", label: "Unusually chatty", prompt: "You are in a good mood and inclined to talk. You still will not commit to anything you have not been convinced of, but you give the rep more rope and tell them more about your world if they ask.", levels: ["warm", "inbound"], weight: 1 },
  { id: "burned", label: "Burned by a vendor", prompt: "You switched vendors in this area last year and it went badly: missed deadlines, a migration that dragged on. You are suspicious of anyone promising a smooth switch, and you say why.", levels: ["inbound", "cold"], weight: 2 },
];

function compose(setting: (typeof SETTINGS)[number], temper: Die): Mood {
  return {
    id: `${setting.id}:${temper.id}`,
    label: temper.id === "neutral" ? setting.label : `${setting.label}, ${temper.label.toLowerCase()}`,
    prompt: `${setting.prompt} ${temper.prompt}`,
    ambience: setting.ambience,
  };
}

function pick<T extends Die>(dice: T[], difficulty: Difficulty, rand: () => number): T {
  const pool = dice.filter((d) => d.levels.includes(difficulty));
  const total = pool.reduce((n, d) => n + d.weight, 0);
  let r = rand() * total;
  for (const d of pool) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return pool[0]!;
}

/** At a desk on a normal day: the fallback when nothing was rolled. */
export const PLAIN_MOOD: Mood = compose(SETTINGS[0]!, TEMPERS[0]!);

/**
 * A repeatable random source from a string, so a roll can be recomputed later from the call's id (the free Karen
 * call has no column for its mood; the start and the scorer both roll from its id and get the same answer).
 */
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Moods from before places and temperaments were rolled separately, so old reports keep their label. */
const LEGACY: Mood[] = [
  { id: "plain", label: "At their desk", prompt: "You are at your desk on a normal day. Nothing special is going on.", ambience: "office" },
  { id: "meeting", label: "Between meetings", prompt: "You have four minutes before your next meeting.", ambience: "office" },
  { id: "car", label: "In the car", prompt: "You are driving, on hands-free.", ambience: "car" },
  { id: "street", label: "On the street", prompt: "You are walking between buildings, outside.", ambience: "street" },
  { id: "home", label: "Working from home", prompt: "You are at home.", ambience: "home" },
  { id: "bad_quarter", label: "Rough quarter", prompt: "Your numbers are bad this quarter.", ambience: "office" },
  { id: "expecting", label: "Expecting another call", prompt: "You picked up thinking this was another call.", ambience: "office" },
  { id: "chatty", label: "Unusually chatty", prompt: "You are in a good mood and inclined to talk.", ambience: "office" },
  { id: "burned", label: "Burned by a vendor", prompt: "You switched vendors in this area last year and it went badly.", ambience: "office" },
];

export function moodById(id: string | null | undefined): Mood | null {
  if (!id) return null;
  const [s, t] = id.split(":");
  const setting = SETTINGS.find((x) => x.id === s);
  const temper = TEMPERS.find((x) => x.id === t);
  if (setting && temper) return compose(setting, temper);
  return LEGACY.find((m) => m.id === id) ?? null;
}

/**
 * Two dice rolled once per call, for every prospect: where they are (the sound bed and what they can do from there)
 * and how their day is going. The level sets how much resistance they give; the dice set the texture, so the same
 * target is never the same person twice and reps train the skill rather than the persona. Boss fights roll at
 * Level 3, which leaves out the temperaments that do not fit a hostile character.
 */
export function rollMood(difficulty: Difficulty, rand = Math.random): Mood {
  return compose(pick(SETTINGS, difficulty, rand), pick(TEMPERS, difficulty, rand));
}

/**
 * Share of cold calls that an assistant or receptionist answers first. Other levels never have one.
 * Off until GATEKEEPER_RATE is set, because the gatekeeper's voice only exists once `pnpm elevenlabs:update`
 * has registered it on the agent; without that the tags would be read aloud in the prospect's voice.
 */
const GATEKEEPER_RATE: Record<Difficulty, number> = { warm: 0, inbound: 0, cold: Math.min(1, Math.max(0, Number(process.env.GATEKEEPER_RATE ?? 0))) };

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
