import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Organization } from "@/types/database";
import { trialStatus } from "./trial";

/** Trial status for an org, counting connected calls only. */
export async function loadTrialStatus(supabase: SupabaseClient<Database>, org: Pick<Organization, "id" | "plan" | "trial_call_limit" | "trial_ends_at">) {
  if (org.plan !== "trial" && org.plan !== "canceled") return trialStatus(org, 0);
  const { count } = await supabase
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .not("started_at", "is", null);
  return trialStatus(org, count ?? 0);
}
