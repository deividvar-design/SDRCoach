import type { Difficulty } from "@/types/database";

export interface LevelSpec {
  id: Difficulty;
  level: 1 | 2 | 3;
  name: string;
  tagline: string;
  description: string;
  /** Behavioural brief injected into the prospect prompt. */
  behaviour: string;
  /** Target call length the UI suggests. */
  suggestedMinutes: number;
}

export const LEVELS: Record<Difficulty, LevelSpec> = {
  warm: {
    id: "warm",
    level: 1,
    name: "Warm-up",
    tagline: "Friendly, curious, low resistance",
    description:
      "A prospect with time on their hands who is happy to talk. Use it to nail your opener, pitch and close without pressure.",
    behaviour:
      "You are open and polite. You answer questions readily, raise at most one soft objection, and agree to a next step if the rep asks clearly.",
    suggestedMinutes: 4,
  },
  inbound: {
    id: "inbound",
    level: 2,
    name: "Inbound lead",
    tagline: "Interested but busy and a little skeptical",
    description:
      "They filled in a form last week and half remember why. Responsive to good questions, impatient with fluff, will push back on price and timing.",
    behaviour:
      "You showed interest recently but are busy. You engage with relevant questions, give short answers, raise two or three realistic objections (timing, budget, existing vendor) and only commit if the rep earns it with discovery and a clear value link.",
    suggestedMinutes: 6,
  },
  cold: {
    id: "cold",
    level: 3,
    name: "Cold & resistant",
    tagline: "Realistic cold call. Challenges everything.",
    description:
      "A senior buyer interrupted mid-task. Skeptical of the opener, tests the rep's credibility, tries to end the call early. The closest thing to a real dial.",
    behaviour:
      "You did not expect this call and are mildly irritated. You interrupt, ask 'who is this and why are you calling', challenge every claim, bring up that you already have a solution, and try to end the call at least twice. You warm up only if the rep stays composed, is specific about your world, and asks a sharp question. Even then you agree only to a short follow-up, never a full demo.",
    suggestedMinutes: 8,
  },
};

export const LEVEL_LIST = Object.values(LEVELS).sort((a, b) => a.level - b.level);
