import "server-only";
import type { Organization } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERVALS, PLANS } from "./plans";
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
  const monthBefore = (d: Date) => {
    const x = new Date(d);
    x.setUTCMonth(x.getUTCMonth() - 1);
    return x;
  };
  let winEnd = end;
  for (let i = 0; i < 24; i++) {
    const candidate = monthBefore(winEnd);
    if (candidate.getTime() <= now) break;
    winEnd = candidate;
  }
  return { start: monthBefore(winEnd), end: winEnd, months: 1 };
}

/**
 * How many practice calls remain: the team pool for managers and trials, the viewer's own seat share for reps.
 * Trials count voice usage rows so deleting calls never refunds them; paid plans count connected sessions.
 * The team pool is what the call route enforces: at zero, nobody in the workspace can dial until it resets.
 */
export async function loadAllowance(org: Org, viewer: { userId: string; isManager: boolean }): Promise<Allowance | null> {
  const db = createAdminClient();

  if (org.plan === "trial" || org.plan === "canceled") {
    const t = trialStatus(org, await countTrialCalls(db, org.id));
    return {
      scope: "team",
      kind: "trial",
      used: t.callsUsed,
      included: org.trial_call_limit,
      left: t.callsLeft,
      over: 0,
      resetsAt: org.trial_ends_at,
      daysLeft: t.onTrial ? t.daysLeft : 0,
    };
  }

  const plan = PLANS.find((p) => p.id === org.plan);
  const window = periodWindow(org);
  if (!plan?.callsPerSeat || !window) return null;

  let query = db
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .not("started_at", "is", null)
    .neq("status", "failed")
    .gte("started_at", window.start.toISOString());
  if (!viewer.isManager) query = query.eq("user_id", viewer.userId);
  const { count } = await query;

  const used = count ?? 0;
  const included = plan.callsPerSeat * window.months * (viewer.isManager ? org.seat_limit : 1);
  return {
    scope: viewer.isManager ? "team" : "you",
    kind: "paid",
    used,
    included,
    left: Math.max(0, included - used),
    over: Math.max(0, used - included),
    resetsAt: window.end.toISOString(),
    daysLeft: Math.max(0, Math.ceil((window.end.getTime() - Date.now()) / 86_400_000)),
  };
}
