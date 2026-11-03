"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { claimAccessLink } from "@/lib/access/links";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { reportError } from "@/lib/sentry";
import { track } from "@vercel/analytics/server";

export interface ClaimState {
  error?: string;
  /** The address already has an account: the form offers sign-in instead. */
  exists?: boolean;
}

/** The recipient picks a password; the account and workspace are created and they are signed in. */
export async function claimAccess(token: string, _prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = z
    .object({ password: z.string().min(8, "Password must be at least 8 characters").max(200), full_name: z.string().trim().max(80).optional() })
    .safeParse({ password: formData.get("password"), full_name: formData.get("full_name") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (process.env.SDRCOACH_DEMO === "1") return { error: "Not available in the demo." };

  const result = await claimAccessLink(token, { password: parsed.data.password, fullName: parsed.data.full_name ?? null });
  if ("error" in result) return { error: result.error, exists: result.code === "exists" };

  after(() => sendLifecycle(result.orgId, "welcome").catch((err) => reportError(err, { where: "welcome_email", orgId: result.orgId })));
  await track("workspace_created", { with_site: false, access_link: true }).catch(() => {});

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: parsed.data.password });
  if (error) redirect(`/login?email=${encodeURIComponent(result.email)}`);
  redirect("/onboarding/context");
}
