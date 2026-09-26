import type { Organization } from "@/types/database";

export interface TrialStatus {
  onTrial: boolean;
  callsUsed: number;
  callsLeft: number;
  daysLeft: number;
  exhausted: boolean;
  reason: "calls" | "time" | "subscription" | null;
}

/** Pure. `usedCalls` counts calls that connected (started_at set), whatever happened to them afterwards. */
export function trialStatus(org: Pick<Organization, "plan" | "trial_call_limit" | "trial_ends_at">, usedCalls: number, now = new Date()): TrialStatus {
  const onTrial = org.plan === "trial";
  if (org.plan === "canceled") return { onTrial: false, callsUsed: usedCalls, callsLeft: 0, daysLeft: 0, exhausted: true, reason: "subscription" };
  if (!onTrial) return { onTrial: false, callsUsed: usedCalls, callsLeft: Infinity, daysLeft: Infinity, exhausted: false, reason: null };
  const callsLeft = Math.max(0, org.trial_call_limit - usedCalls);
  const daysLeft = Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - now.getTime()) / 86_400_000));
  const reason = callsLeft === 0 ? "calls" : daysLeft === 0 ? "time" : null;
  return { onTrial: true, callsUsed: usedCalls, callsLeft, daysLeft, exhausted: reason !== null, reason };
}
