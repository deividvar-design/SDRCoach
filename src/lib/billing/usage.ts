import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Organization } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialStatus } from "./trial";

type Db = SupabaseClient<Database>;

/**
 * Connected calls consumed by a trial. Counted from voice usage rows, which the server writes once per call and
 * which survive the call being deleted (session_id is nulled, org_id stays), so deleting calls never refunds them.
 */
export async function countTrialCalls(db: Db, orgId: string) {
  const { count } = await db.from("usage_events").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "voice");
  return count ?? 0;
}

/** Trial status for an org. usage_events is server-only, so this always reads with the service role. */
export async function loadTrialStatus(org: Pick<Organization, "id" | "plan" | "trial_call_limit" | "trial_ends_at">) {
  if (org.plan !== "trial" && org.plan !== "canceled") return trialStatus(org, 0);
  return trialStatus(org, await countTrialCalls(createAdminClient(), org.id));
}
