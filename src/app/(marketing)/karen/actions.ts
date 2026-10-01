"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateBusinessEmail } from "@/lib/email/business";
import { checkDemoLimits } from "@/lib/demo/boss";
import { DEMO_COOKIE, clientIp } from "@/lib/demo/session";

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

export async function challengeKaren(_prev: ChallengeState, formData: FormData): Promise<ChallengeState> {
  const parsed = z.object({ email: z.string().email("Enter a valid email"), newsletter: z.string().optional() }).safeParse({ email: formData.get("email"), newsletter: formData.get("newsletter") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const email = parsed.data.email.trim().toLowerCase();

  const check = await validateBusinessEmail(email);
  if (!check.ok) return { error: check.message };

  const db = createAdminClient();
  const ip = await clientIp();
  const limit = await checkDemoLimits(db, { email, domain: check.domain, ip });
  if (limit === "busy") {
    // Keep the lead, skip the call. The row counts against nothing since it never connects.
    await db.from("demo_calls").insert({ email, domain: check.domain, ip, newsletter: parsed.data.newsletter === "on", status: "failed", error: "daily cap" });
    return { waitlisted: true };
  }
  if (limit) return { error: LIMIT_MESSAGES[limit] ?? "Try again later." };

  const { data: demo, error } = await db.from("demo_calls").insert({ email, domain: check.domain, ip, newsletter: parsed.data.newsletter === "on" }).select("id").single();
  if (error || !demo) return { error: "Something went wrong. Try again in a minute." };

  await track("demo_started", { domain: check.domain }).catch(() => {});
  (await cookies()).set(DEMO_COOKIE, demo.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3 * 60 * 60 });
  redirect("/karen/call");
}
