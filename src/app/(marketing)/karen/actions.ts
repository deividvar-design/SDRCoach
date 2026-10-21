"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailDomain, emailDomain, hasMx } from "@/lib/email/business";
import { checkDemoLimits } from "@/lib/demo/boss";
import { DEMO_COOKIE, clientIp, currentDemo } from "@/lib/demo/session";
import { newShareSlug } from "@/lib/demo/share";
import { logFunnel } from "@/lib/funnel";
import { readAdClick } from "@/lib/ads/click";

export interface ChallengeState {
  error?: string;
  /** The daily cap is hit: the email was kept so we can say when Karen is free again. */
  waitlisted?: boolean;
}

const LIMIT_MESSAGES: Record<string, string> = {
  already_played: "That address has already had its go. Karen remembers. Start a free trial to call her again.",
  domain_limit: "Three people from your company have already called Karen today. Try again tomorrow, or start a free trial.",
  ip_limit: "Karen has had enough calls from this connection today. Try again tomorrow.",
};

const REJECT_MESSAGES: Record<string, string> = {
  invalid: "Enter a valid email address.",
  disposable: "Temporary addresses can't call Karen. Use one you can read the scorecard at.",
  no_mx: "That domain can't receive email. Check the spelling.",
};

/**
 * Any real address can call Karen once. A personal address is flagged so the scorecard email asks for a work
 * one before a trial, and it skips the per-company limit, which would otherwise lump every Gmail caller together.
 */
export async function challengeKaren(_prev: ChallengeState, formData: FormData): Promise<ChallengeState> {
  const parsed = z
    .object({ email: z.string().email("Enter a valid email"), company: z.string().trim().max(80).optional(), newsletter: z.string().optional() })
    .safeParse({ email: formData.get("email"), company: formData.get("company") || undefined, newsletter: formData.get("newsletter") || undefined });
  if (!parsed.success) {
    await logFunnel("karen_submit");
    await logFunnel("karen_rejected", { reason: "invalid" });
    return { error: parsed.error.issues[0]?.message };
  }
  const email = parsed.data.email.trim().toLowerCase();
  const company = parsed.data.company?.replace(/\s+/g, " ") || null;
  await logFunnel("karen_submit", { email, meta: { company: Boolean(company) } });

  const listed = classifyEmailDomain(email);
  const personal = !listed.ok && listed.reason === "free";
  if (!listed.ok && !personal) {
    await logFunnel("karen_rejected", { email, reason: listed.reason });
    return { error: REJECT_MESSAGES[listed.reason] ?? "Enter a valid email address." };
  }
  const domain = listed.ok ? listed.domain : emailDomain(email)!;
  const skipMx = process.env.SDRCOACH_DEMO === "1" || process.env.SKIP_MX_CHECK === "1";
  if (!skipMx && !(await hasMx(domain))) {
    await logFunnel("karen_rejected", { email, reason: "no_mx" });
    return { error: REJECT_MESSAGES.no_mx };
  }

  const db = createAdminClient();
  const ip = await clientIp();
  const limit = await checkDemoLimits(db, { email, domain, ip, personal });
  if (limit === "busy") {
    // Keep the lead, skip the call. The row counts against nothing since it never connects.
    await db.from("demo_calls").insert({ email, domain, ip, company, personal_email: personal, newsletter: parsed.data.newsletter === "on", status: "failed", error: "daily cap" });
    await logFunnel("karen_rejected", { email, reason: "busy" });
    return { waitlisted: true };
  }
  if (limit) {
    await logFunnel("karen_rejected", { email, reason: limit });
    return { error: LIMIT_MESSAGES[limit] ?? "Try again later." };
  }

  const click = await readAdClick();
  const { data: demo, error } = await db
    .from("demo_calls")
    .insert({ email, domain, ip, company, personal_email: personal, newsletter: parsed.data.newsletter === "on", share_slug: newShareSlug(), ...click })
    .select("id")
    .single();
  if (error || !demo) {
    await logFunnel("karen_rejected", { email, reason: "insert_failed" });
    return { error: "Something went wrong. Try again in a minute." };
  }

  await track("demo_started", { domain, personal }).catch(() => {});
  (await cookies()).set(DEMO_COOKIE, demo.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3 * 60 * 60 });
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
