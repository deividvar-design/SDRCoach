/**
 * The reward cards: what earns extra calls and how many. Shared by the app page, the admin queue, the emails and the
 * marketing page, so the numbers live here once. Calls cost us well under a dollar each, so the rewards are sized to
 * be worth doing, and the caps guard against farming rather than against the bill.
 */
export type RewardKind = "linkedin_post" | "x_post" | "scorecard_share" | "invite_rep" | "referral_trial" | "referral_paid";
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface RewardSpec {
  kind: RewardKind;
  title: string;
  /** Calls added to the workspace pool. */
  calls: number;
  /** Extra trial days, only while the workspace is on the trial. */
  trialDays: number;
  /** True when a person pastes a link and we approve it by hand. */
  manual: boolean;
  /** The hosts a pasted link must be on. */
  hosts?: string[];
  blurb: string;
  steps: string[];
  cta: string;
}

export const INVITE_REWARD_CAP = 5;
/** Connected calls a referred workspace must make before the referrer is paid. */
export const REFERRAL_ACTIVATION_CALLS = 3;
/** Calls instead of a free month when the referrer is not on a monthly plan. */
export const REFERRAL_PAID_FALLBACK_CALLS = 100;
/** What the referred team gets: the coupon id is created in Stripe on first use. */
export const REFERRED_DISCOUNT = { coupon: "REFERRAL20", percent: 20, months: 3 } as const;
export const REFERRER_MONTH_COUPON = "REFERRALMONTH";

export const REWARDS: RewardSpec[] = [
  {
    kind: "linkedin_post",
    title: "Post about 100 Dials on LinkedIn",
    calls: 25,
    trialDays: 7,
    manual: true,
    hosts: ["linkedin.com"],
    blurb: "A post about how your team practises. Your words, no template needed.",
    steps: ["Write a post about your experience", "Tag 100 Dials or link to 100dials.com", "Paste the post link here"],
    cta: "I posted",
  },
  {
    kind: "x_post",
    title: "Post on X",
    calls: 10,
    trialDays: 0,
    manual: true,
    hosts: ["x.com", "twitter.com"],
    blurb: "Same idea, shorter. A line about a call that went badly works best.",
    steps: ["Post about your experience", "Mention @100dials or link to 100dials.com", "Paste the post link here"],
    cta: "I posted",
  },
  {
    kind: "scorecard_share",
    title: "Share your Karen scorecard",
    calls: 10,
    trialDays: 0,
    manual: true,
    hosts: ["linkedin.com", "x.com", "twitter.com"],
    blurb: "Your public Karen scorecard, posted on LinkedIn or X. Losing to her is the whole point.",
    steps: ["Open your scorecard from your Karen result page", "Share it on LinkedIn or X", "Paste the post link here"],
    cta: "I shared it",
  },
  {
    kind: "invite_rep",
    title: "Invite a rep who makes a first call",
    calls: 10,
    trialDays: 0,
    manual: false,
    blurb: `Every invited rep with a work email who makes a first call adds calls to the pool. Up to ${INVITE_REWARD_CAP} reps.`,
    steps: ["Invite a rep from the Team page", "They join with their work email", "Their first connected call pays out"],
    cta: "Invite a rep",
  },
  {
    kind: "referral_trial",
    title: "Refer another team",
    calls: 25,
    trialDays: 0,
    manual: false,
    blurb: `Send a sales team your link. When they make ${REFERRAL_ACTIVATION_CALLS} calls you get the calls; when they subscribe you get a month free, and they get ${REFERRED_DISCOUNT.percent}% off their first ${REFERRED_DISCOUNT.months} months.`,
    steps: ["Copy your referral link", "They sign up through it", `${REFERRAL_ACTIVATION_CALLS} calls pays the calls, a subscription pays the month`],
    cta: "Copy link",
  },
];

export const REWARD_BY_KIND: Record<RewardKind, RewardSpec> = Object.fromEntries([
  ...REWARDS.map((r) => [r.kind, r]),
  ["referral_paid", { kind: "referral_paid", title: "Referred team subscribed", calls: REFERRAL_PAID_FALLBACK_CALLS, trialDays: 0, manual: false, blurb: "", steps: [], cta: "" } satisfies RewardSpec],
]) as Record<RewardKind, RewardSpec>;

export const MANUAL_KINDS: RewardKind[] = REWARDS.filter((r) => r.manual).map((r) => r.kind);

/** Human line for a grant: "25 calls and 7 more days" or "100 calls". */
export function rewardLine(calls: number, days: number) {
  const parts = [calls > 0 ? `${calls} call${calls === 1 ? "" : "s"}` : null, days > 0 ? `${days} more day${days === 1 ? "" : "s"}` : null].filter(Boolean);
  return parts.join(" and ") || "nothing";
}

/** The pasted link must be a real post on the right network, not a profile or a homepage. */
export function validPostUrl(kind: RewardKind, raw: string): URL | null {
  const spec = REWARD_BY_KIND[kind];
  if (!spec?.hosts) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  if (!spec.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  if (url.pathname.length < 8) return null;
  return url;
}
