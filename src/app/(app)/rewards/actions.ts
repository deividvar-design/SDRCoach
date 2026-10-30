"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logFunnel } from "@/lib/funnel";
import { MANUAL_KINDS, REWARD_BY_KIND, validPostUrl, type RewardKind } from "@/lib/rewards/config";

export interface ClaimState {
  error?: string;
  submitted?: boolean;
}

/** A pasted post link for one of the manual rewards. Pending until it is approved from the admin queue. */
export async function submitClaim(kind: RewardKind, _prev: ClaimState, formData: FormData): Promise<ClaimState> {
  if (!MANUAL_KINDS.includes(kind)) return { error: "That reward is not claimed with a link." };
  const viewer = await requireViewer();
  const url = validPostUrl(kind, String(formData.get("url") ?? ""));
  if (!url) {
    const hosts = REWARD_BY_KIND[kind].hosts?.join(" or ") ?? "the right site";
    return { error: `Paste the link to the post itself, on ${hosts}.` };
  }
  const spec = REWARD_BY_KIND[kind];
  const days = viewer.org.plan === "trial" ? spec.trialDays : 0;
  const { error } = await createAdminClient().from("reward_claims").insert({ org_id: viewer.org.id, user_id: viewer.userId, kind, url: url.href, calls: spec.calls, days });
  if (error) {
    if (error.code === "23505") return { error: "This one has already been claimed for your workspace." };
    return { error: "Could not save that. Try again in a minute." };
  }
  await logFunnel("reward_claimed", { email: viewer.email, subject: viewer.org.id, reason: kind, meta: { host: url.hostname } });
  revalidatePath("/rewards");
  return { submitted: true };
}
