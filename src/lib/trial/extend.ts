import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Adds calls and days to a trial. Days count from today or the current end, whichever is later, so a trial that ran
 * out of calls early is reopened rather than extended from a date in the past. Refuses a paying workspace: putting it
 * back on a trial would lock it out of what it pays for.
 */
export async function applyTrialExtension(db: Db, orgId: string, p: { calls: number; days: number }): Promise<{ ok: true; trialEndsAt: string; callLimit: number } | { error: string }> {
  const { data: org } = await db.from("organizations").select("trial_ends_at, trial_call_limit, plan, stripe_subscription_id").eq("id", orgId).single();
  if (!org) return { error: "Workspace not found." };
  if (org.stripe_subscription_id || (org.plan !== "trial" && org.plan !== "canceled")) return { error: "This workspace is on a paid plan. Extending a trial would lock it out; adjust the plan instead." };
  const base = Math.max(Date.now(), new Date(org.trial_ends_at).getTime());
  const patch = { trial_ends_at: new Date(base + p.days * 86_400_000).toISOString(), trial_call_limit: org.trial_call_limit + p.calls, plan: "trial" };
  const { error } = await db.from("organizations").update(patch).eq("id", orgId);
  if (error) return { error: error.message };
  return { ok: true, trialEndsAt: patch.trial_ends_at, callLimit: patch.trial_call_limit };
}
