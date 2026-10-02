import { BOSS_PERSONAS } from "@/content/boss-personas";

/**
 * Scripted boss fight for the homepage player: Karen, as text. Timings in ms from call start.
 * Nobody books her. The rep's win is staying composed and getting the letter in her file.
 */
const karen = BOSS_PERSONAS[0];

export const SAMPLE_CALL = {
  prospect: { name: karen.name, title: karen.title, company: karen.company },
  rep: "Sam",
  label: "BOSS FIGHT · KAREN · DIAL 037/100",
  audioSrc: null as string | null,
  turns: [
    { t: 0, role: "prospect", text: "Whitlock. I don't take cold calls, so you can start by telling me who gave you permission to ring this number." },
    { t: 3200, role: "rep", text: "Karen, it's Sam from Brightline. Nobody gave it to me, I looked you up. You have three supplier contracts renewing this quarter, and that's the only reason I'm calling. Thirty seconds, then you decide." },
    { t: 13500, role: "prospect", text: "Do you have any idea who you're speaking to? Twenty-two years in procurement. I'm making a note of this." },
    { t: 20000, role: "rep", text: "Noted. Then you know what a renewal costs when a vendor misses service levels and blames your team for it." },
    { t: 26500, role: "prospect", text: "That is not an answer, that is a sales line. Are you an approved vendor? No. Then why are we talking?" },
    { t: 33500, role: "rep", text: "We're not approved, and I'm not asking for a contract. I'm asking for ten minutes before your vendor audit, so the comparison sits in your file instead of theirs." },
    { t: 42500, role: "prospect", text: "I'll need that in writing from your director before I waste another minute." },
    { t: 47000, role: "rep", text: "You'll have it by five today, with the audit checklist attached. If it's unacceptable, bin it. Tuesday at nine for the ten minutes, or should I only send the letter?" },
    { t: 55500, role: "prospect", text: "Send the letter. I'm not promising anything." },
    { t: 58000, role: "rep", text: "Understood. Letter by five. Thank you, Karen." },
  ] as { t: number; role: "rep" | "prospect"; text: string }[],
  endsAt: 60000,
  result: {
    overall: 7.6,
    outcome: "No meeting. She took the letter.",
    outcomeTone: "neutral" as "success" | "neutral",
    outcomeReason: "I will read it. That is not a yes.",
    coach: "You never argued and you never apologised, and that is why she was still on the line at a minute. One thing: when she asked who approved the call, answer in one sentence and get back to the renewal. You spent eight seconds defending the dial.",
    dimensions: [
      ["Opener", 7.2],
      ["Reason for call", 8.1],
      ["Discovery", 6.4],
      ["Objection handling", 8.4],
      ["Value proposition", 7.0],
      ["Close", 7.3],
    ] as [string, number][],
  },
};
