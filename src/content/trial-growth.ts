/** The out-of-calls screen's two forms: what an extension request asks, and what the manager email says. */

export const EXTENSION_USE_CASES = [
  { id: "ramping", label: "Ramping new reps" },
  { id: "testing", label: "Testing it before we buy" },
  { id: "personal", label: "Practising on my own" },
  { id: "other", label: "Something else" },
] as const;

export const EXTENSION_DECIDERS = [
  { id: "me", label: "Me" },
  { id: "manager", label: "My manager" },
  { id: "other", label: "Someone else" },
] as const;

export const EXTENSION_TIMELINES = [
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
  { id: "none", label: "No plan yet" },
] as const;

export type ExtensionUseCase = (typeof EXTENSION_USE_CASES)[number]["id"];
export type ExtensionDecider = (typeof EXTENSION_DECIDERS)[number]["id"];
export type ExtensionTimeline = (typeof EXTENSION_TIMELINES)[number]["id"];

export const EXTENSION = {
  /** A workspace can ask again this many days after a decision. */
  cooldownDays: 7,
  /** What the form promises, so nobody expects a number they did not get. */
  usual: "We usually add 10 to 20 calls.",
} as const;

export const MANAGER_INTRO = {
  /** How many different managers one rep may write to. */
  maxPerRep: 3,
};

/** What the rep's own calls say, for the email and the screen. Nulls where there is not enough to say. */
export interface RepStats {
  calls: number;
  firstAvg: number | null;
  lastAvg: number | null;
  topFix: string | null;
}

export interface ManagerIntroInput {
  managerName: string;
  repName: string;
  repEmail: string;
  orgName: string;
  note: string | null;
  stats: RepStats;
  link: string;
}

/**
 * The email, as plain lines, so the rep sees exactly what goes out and the template wraps the same text. The pitch
 * is the manager's: a free trial to see how good the team is at cold calling and where each rep can improve.
 */
export function managerIntroCopy(p: ManagerIntroInput): { subject: string; lines: string[] } {
  const first = p.repName.trim().split(/\s+/)[0] || "A rep";
  const score =
    p.stats.firstAvg !== null && p.stats.lastAvg !== null && p.stats.calls > 1
      ? `${first} has made ${p.stats.calls} scored practice calls and went from ${p.stats.firstAvg} to ${p.stats.lastAvg} out of 10.`
      : p.stats.calls > 0 && p.stats.lastAvg !== null
        ? `${first} has made ${p.stats.calls} scored practice ${p.stats.calls === 1 ? "call" : "calls"}, scoring ${p.stats.lastAvg} out of 10.`
        : `${first} has been practising cold calls.`;
  const lines = [
    `Hi ${p.managerName.trim().split(/\s+/)[0] || "there"},`,
    `${p.repName} asked us to send you this. ${score}${p.stats.topFix ? ` The one thing the coach keeps flagging: ${p.stats.topFix}` : ""}`,
    `100 Dials is a cold-call practice line. Reps dial AI prospects built from your own target accounts, and every call comes back scored on six skills with the one thing to fix.`,
    `The trial is free, for you: five calls per workspace, no card. Enough to see how good your SDRs are at cold calling, and where each of them can improve, before it costs you a real prospect.`,
    ...(p.note ? [`From ${first}: "${p.note.trim()}"`] : []),
  ];
  return { subject: `${first} has been practising cold calls. Here's how it went.`, lines };
}
