import type { CallMetrics, ScoreDimensions, TranscriptTurn } from "@/types/database";
import type { ObjectionKind } from "@/lib/scoring/rubric";

/**
 * One scored call against Karen, shown on /sample-report exactly the way a rep sees their own. A scripted sample
 * with an anonymous rep, labelled as such on the page: no customer, no quote, no number that was not in the call.
 */
export const SAMPLE_REPORT = {
  rep: "Sample rep",
  company: "Example Co",
  prospect: { name: "Karen Whitlock", title: "Head of Procurement", company: "Meridian Living Group" },
  durationSeconds: 132,
  overall: 6.6,
  outcome: "hung_up" as const,
  outcomeReason: "I asked what you actually do and got a category. I have a supplier review in ten minutes.",
  coachSummary:
    "You survived two minutes against a prospect who ends most calls in ten seconds. The opener and the reason for the call carried it: she gave you the extra twenty seconds because you asked for them. You lost her at the value line. She asked what you actually do, and the answer was a description, not a result. Fix that one sentence and this is a callback.",
  dimensions: {
    opener: { score: 7, rationale: "“Karen, Sample rep from Example Co. I know I'm an interruption. Twenty seconds on why I called, then you decide?” Named yourself, named the company, asked permission with a time box. No “how are you today”. The 7 not an 8: it ran a beat long." },
    reason_for_call: { score: 8, rationale: "“Three of your supplier contracts renew in Q1, and that renewal crunch is the only reason I'm calling.” Specific to her role, stated in the first twenty seconds, and it answered “who gave you this number” without getting defensive." },
    discovery: { score: 6, rationale: "One real question: “How are you running those three renewals today, one owner or three?” She answered it. Then you explained instead of asking the follow-up she handed you: she said “it's me and a spreadsheet” and that was the door." },
    objection_handling: { score: 7, rationale: "On “send me an email” you agreed and asked what would make it worth reading. Good. On “I'm not interested” you repeated the pitch instead of asking what she would change about the spreadsheet." },
    value_prop: { score: 5, rationale: "“We help procurement teams manage supplier renewals” is a category, not an outcome. She asked “what do you actually do” and the answer never got to a number a procurement lead would recognise, like days saved per renewal or a missed auto-renew caught." },
    close: { score: 6, rationale: "You asked for “fifteen minutes next week”. Not a day, not a time, so there was nothing for her to say yes to. The ask came after she had already said she was leaving." },
  } satisfies ScoreDimensions,
  strengths: [
    "Asked permission with a time box at 0:03 instead of “how are you today?”, which is what earned the next twenty seconds.",
    "Answered “who gave you this number” plainly and went straight back to the reason for calling.",
    "On “send me an email” you agreed and asked what would make it worth reading. That restarted the conversation.",
  ],
  improvements: [
    "When she said “it's me and a spreadsheet” at 0:48, stop and ask what goes wrong with that. That was the real problem and you talked past it.",
    "Replace “we help procurement teams manage supplier renewals” with one outcome and one number. She asked what you do; give her a result.",
    "Ask for Thursday at ten, not “fifteen minutes next week”. A specific slot is something she can accept or move.",
  ],
  metrics: {
    rep_talk_ratio: 0.58,
    longest_rep_monologue_secs: 31,
    rep_questions: 3,
    filler_words: 6,
    first_objection_secs: 9,
    rep_turns: 9,
    prospect_turns: 10,
    interruptions_by_rep: 1,
  } satisfies CallMetrics,
  objections: [
    { kind: "how_did_you_get_my_number" as ObjectionKind, quote: "Who gave you this number?", t_ms: 9000, handled: "handled" as const },
    { kind: "send_email" as ObjectionKind, quote: "Send me something and I'll look at it if I get a minute.", t_ms: 61000, handled: "handled" as const },
    { kind: "not_interested" as ObjectionKind, quote: "I'm not interested. What do you actually do?", t_ms: 88000, handled: "partial" as const },
    { kind: "no_time" as ObjectionKind, quote: "I have a supplier review in ten minutes.", t_ms: 118000, handled: "missed" as const },
  ],
  transcript: [
    { role: "prospect", text: "This had better be important.", t_start_ms: 0 },
    { role: "rep", text: "Karen, Sample rep from Example Co. I know I'm an interruption. Twenty seconds on why I called, then you decide?", t_start_ms: 3000 },
    { role: "prospect", text: "Who gave you this number?", t_start_ms: 9000 },
    { role: "rep", text: "Your supplier page lists you for vendor onboarding. Three of your supplier contracts renew in Q1, and that renewal crunch is the only reason I'm calling.", t_start_ms: 11000 },
    { role: "prospect", text: "Twenty seconds. Go.", t_start_ms: 22000 },
    { role: "rep", text: "How are you running those three renewals today, one owner or three?", t_start_ms: 24000 },
    { role: "prospect", text: "It's me and a spreadsheet. Same as every year.", t_start_ms: 48000 },
    { role: "rep", text: "That's what we hear from most procurement leads your size. We help procurement teams manage supplier renewals so nothing auto-renews without a review, with the owners and dates in one place instead of a spreadsheet.", t_start_ms: 51000 },
    { role: "prospect", text: "Send me something and I'll look at it if I get a minute.", t_start_ms: 61000 },
    { role: "rep", text: "Happy to. What would make it worth opening: the auto-renew checks, or the renewal calendar?", t_start_ms: 64000 },
    { role: "prospect", text: "I'm not interested. What do you actually do?", t_start_ms: 88000 },
    { role: "rep", text: "We help procurement teams manage supplier renewals. Think of it as a renewals desk that chases the owners for you.", t_start_ms: 91000 },
    { role: "prospect", text: "That's a description. I have a supplier review in ten minutes.", t_start_ms: 118000 },
    { role: "rep", text: "Understood. Could I get fifteen minutes next week to walk you through it?", t_start_ms: 121000 },
    { role: "prospect", text: "No. Don't call this number again.", t_start_ms: 128000 },
  ] satisfies TranscriptTurn[],
};
