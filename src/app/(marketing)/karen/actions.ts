"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_COOKIE, currentDemo } from "@/lib/demo/session";
import { DEMO_COOKIE_OPTIONS, startDemo } from "@/lib/demo/start";
import { logFunnel } from "@/lib/funnel";

export interface ChallengeState {
  error?: string;
  /** The daily cap is hit: the email was kept so we can say when Karen is free again. */
  waitlisted?: boolean;
}

/** The form path into a Karen call. The Google button and One Tap reach the same startDemo through /karen/start. */
export async function challengeKaren(_prev: ChallengeState, formData: FormData): Promise<ChallengeState> {
  const parsed = z
    .object({ email: z.string().email("Enter a valid email"), company: z.string().trim().max(80).optional(), newsletter: z.string().optional() })
    .safeParse({ email: formData.get("email"), company: formData.get("company") || undefined, newsletter: formData.get("newsletter") || undefined });
  if (!parsed.success) {
    await logFunnel("karen_submit", { meta: { method: "email" } });
    await logFunnel("karen_rejected", { reason: "invalid", meta: { method: "email" } });
    return { error: parsed.error.issues[0]?.message };
  }
  const result = await startDemo({ email: parsed.data.email, company: parsed.data.company, newsletter: parsed.data.newsletter === "on", method: "email" });
  if ("waitlisted" in result) return { waitlisted: true };
  if ("error" in result) return { error: result.error };
  (await cookies()).set(DEMO_COOKIE, result.id, DEMO_COOKIE_OPTIONS);
  redirect("/karen/call");
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
