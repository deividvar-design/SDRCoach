import "server-only";
import type { Organization } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "./plans";
import { countTrialCalls } from "./usage";
import { trialStatus } from "./trial";

export interface Allowance {
  /** Whose calls the numbers describe. Trials are pooled, so everyone sees the team figure. */
  scope: "team" | "you";
  kind: "trial" | "paid";
  used: number;
  included: number;
  /** Never negative. Dialing stops at zero; `over` only exceeds zero in a race between two simultaneous dials. */
  left: number;
  over: number;
  /** ISO date the allowance renews or the trial ends, null when unknown. */
  resetsAt: string | null;
  daysLeft: number | null;
}

type Org = Pick<Organization, "id" | "plan" | "seat_limit" | "trial_call_limit" | "trial_ends_at" | "billing_interval" | "current_period_end">;

/**
 * The current allowance month on a paid plan. Allowances are per seat per month whatever the billing period, so the
 * window is one month long, stepping back from the period end until it covers now. Resets at the window's end.
 */
export function periodWindow(org: Pick<Org, "billing_interval" | "current_period_end">, now = Date.now()): { start: Date; end: Date; months: number } | null {
  if (!org.current_period_end) return null;
  const end = new Date(org.current_period_end);
  // The i-th anchor is computed from the period end directly, with the day clamped, so a period ending on the 31st
  // never drifts earlier month after month.
  const anchor = (i: number) => {
    const y = end.getUTCFullYear();
    const m = end.getUTCMonth() - i;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(end.getUTCDate(), lastDay), end.getUTCHours(), end.getUTCMinutes(), end.getUTCSeconds()));
  };
  let i = 0;
  while (i < 36 && anchor(i + 1).getTime() > now) i += 1;
  return { start: anchor(i + 1), end: anchor(i), months: 1 };
}

/** A paid plan with no period end on record (invoice customers set up by hand) runs on calendar months. */
function calendarMonth(now = Date.now()) {
  const d = new Date(now);
  return { start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)), months: 1 };
}

/**
 * How many practice calls remain for the workspace this month. Everyone sees the same team pool, because the pool is
 * what the call route enforces: at zero, nobody in the workspace can dial until it resets or a seat is added.
 */
export async function loadAllowance(org: Org, viewer?: { userId: string; isManager: boolean }): Promise<Allowance | null> {
  // Everyone sees the pool the call route enforces; the viewer argument is kept so call sites need not change.
  void viewer;
  const db = createAdminClient();

  if (org.plan === "trial") {
    const t = trialStatus(org, await countTrialCalls(db, org.id));
    return { scope: "team", kind: "trial", used: t.callsUsed, included: org.trial_call_limit, left: t.callsLeft, over: 0, resetsAt: org.trial_ends_at, daysLeft: t.onTrial ? t.daysLeft : 0 };
  }
  // A canceled workspace is gated elsewhere; trial numbers would be nonsense for it.
  if (org.plan === "canceled") return null;

  const plan = PLANS.find((p) => p.id === org.plan);
  if (!plan?.callsPerSeat) return null;
  const window = periodWindow(org) ?? calendarMonth();

  // Voice usage rows are written the moment a token is minted and survive call deletion, so this is the same
  // count the trial uses and it cannot be dodged by a client that never reports the call as started.
  const { count } = await db.from("usage_events").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("kind", "voice").gte("created_at", window.start.toISOString());
  const used = count ?? 0;
  const included = plan.callsPerSeat * window.months * org.seat_limit;
  return {
    scope: "team",
    kind: "paid",
    used,
    included,
    left: Math.max(0, included - used),
    over: Math.max(0, used - included),
    resetsAt: window.end.toISOString(),
    daysLeft: Math.max(0, Math.ceil((window.end.getTime() - Date.now()) / 86_400_000)),
  };
}
