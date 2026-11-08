import type { Difficulty } from "@/types/database";

export interface LevelSpec {
  id: Difficulty;
  level: 1 | 2 | 3;
  name: string;
  tagline: string;
  description: string;
  /** Behavioural brief injected into the prospect prompt. */
  behaviour: string;
}

export const LEVELS: Record<Difficulty, LevelSpec> = {
  warm: {
    id: "warm",
    level: 1,
    name: "Warm-up",
    tagline: "Friendly, curious, low resistance",
    description:
      "A prospect who has time and is happy to talk. Use it to practice your opener, pitch and close with no pressure.",
    behaviour:
      "You are open and polite. You answer questions readily, raise at most one soft objection, and agree to a next step if the rep asks clearly.",
  },
  inbound: {
    id: "inbound",
    level: 2,
    name: "Inbound lead",
    tagline: "Interested but busy and a little skeptical",
    description:
      "They filled in a form last week and only half remember why. They like good questions, lose interest in fluff, and push back on price and timing.",
    behaviour:
      "You showed interest recently but are busy. You engage with relevant questions, give short answers, raise two or three realistic objections (timing, budget, existing vendor) and only commit if the rep earns it with discovery and a clear value link.",
  },
  cold: {
    id: "cold",
    level: 3,
    name: "Cold and tough",
    tagline: "A real cold call. Questions everything.",
    description:
      "A busy senior buyer you just interrupted. They doubt your opener, test if you know your stuff, and try to end the call early. It's the closest thing to a real cold call.",
    behaviour:
      "You did not expect this call and are mildly irritated. You interrupt, ask 'who is this and why are you calling', challenge every claim, bring up that you already have a solution, and try to end the call at least twice. You warm up only if the rep stays composed, is specific about your world, and asks a sharp question. Even then you agree only to a short follow-up, never a full demo.",
  },
};

export const LEVEL_LIST = Object.values(LEVELS).sort((a, b) => a.level - b.level);
