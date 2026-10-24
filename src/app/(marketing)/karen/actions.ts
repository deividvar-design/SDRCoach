"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE, currentDemo } from "@/lib/demo/session";
import { DEMO_COOKIE_OPTIONS, attachDemoEmail, startDemo } from "@/lib/demo/start";

/**
 * The call button. No form, no email: Karen picks up and the caller is asked where to send the scorecard after.
 * Someone already signed in with Google keeps their address on the call, so the result page skips that step.
 */
export async function callKaren() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const result = await startDemo({ email, method: email ? "google" : "call" });
  if ("waitlisted" in result) redirect("/karen?busy=1");
  if ("error" in result) redirect(`/karen?error=${encodeURIComponent(result.code)}`);
  (await cookies()).set(DEMO_COOKIE, result.id, DEMO_COOKIE_OPTIONS);
  redirect("/karen/call");
}

export interface EmailStepState {
  error?: string;
  done?: boolean;
  personal?: boolean;
}

/** The email step on the result page: where the scorecard goes. Only the browser that made the call can set it. */
export async function addDemoEmail(_prev: EmailStepState, formData: FormData): Promise<EmailStepState> {
  const parsed = z
    .object({ email: z.string().email("Enter a valid email"), company: z.string().trim().max(80).optional(), newsletter: z.string().optional() })
    .safeParse({ email: formData.get("email"), company: formData.get("company") || undefined, newsletter: formData.get("newsletter") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const demo = await currentDemo();
  if (!demo) return { error: "That call is no longer on file." };
  if (demo.email) return { done: true, personal: demo.personal_email };
  const result = await attachDemoEmail(demo.id, parsed.data.email, { company: parsed.data.company, newsletter: parsed.data.newsletter === "on" });
  if ("error" in result) return { error: result.error };
  revalidatePath("/karen/result");
  return { done: true, personal: result.personal };
}

export interface LeaderboardState {
  error?: string;
  joined?: boolean;
}

/** Opt in to the public leaderboard with a first name and, optionally, a company. Only the browser that made the call can. */
export async function joinLeaderboard(_prev: LeaderboardState, formData: FormData): Promise<LeaderboardState> {
  const parsed = z
    .object({ display_name: z.string().trim().min(1, "Add a first name").max(30), display_company: z.string().trim().max(40).optional() })
    .safeParse({ display_name: formData.get("display_name"), display_company: formData.get("display_company") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const demo = await currentDemo();
  if (!demo || demo.status !== "scored") return { error: "Finish a call first." };
  const { error } = await createAdminClient()
    .from("demo_calls")
    .update({ display_name: parsed.data.display_name.split(/\s+/)[0], display_company: parsed.data.display_company || null, leaderboard_opt_in: true })
    .eq("id", demo.id);
  if (error) return { error: "Could not save that. Try again." };
  return { joined: true };
}
