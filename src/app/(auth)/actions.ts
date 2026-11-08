"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { validateTrialEmail } from "@/lib/email/business";
import { safeNext } from "@/lib/safe-next";
import { isAdminEmail } from "@/lib/auth";
import { appUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportError } from "@/lib/sentry";
import { heroVariant } from "@/lib/marketing/hero";
import { logFunnel } from "@/lib/funnel";
import { readAdClick } from "@/lib/ads/click";

export interface AuthState {
  error?: string;
  message?: string;
  /** Sign-up went through and a confirmation email is on its way to this address. */
  confirmEmail?: string;
  /** Sign-in refused because this address has not been confirmed yet. */
  unconfirmedEmail?: string;
}

const credentials = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});


export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return { error: "Confirm your email first: the link is in the email we sent when you signed up.", unconfirmedEmail: parsed.data.email };
  }
  if (error) return { error: "Wrong email or password." };

  redirect(safeNext(formData.get("next")));
}

/** "team:year" from the pricing page, kept only when it names a real plan and interval. */
function parsePlanIntent(value: unknown) {
  return typeof value === "string" && /^(starter|team):(month|quarter|year)$/.test(value) ? value : null;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const invite = typeof formData.get("invite") === "string" ? String(formData.get("invite")) : "";
  const planIntent = parsePlanIntent(formData.get("plan_intent"));
  const parsed = credentials
    .extend({ full_name: z.string().trim().max(80).optional() })
    .safeParse({ email: formData.get("email"), password: formData.get("password"), full_name: formData.get("full_name") || undefined });
  const rawEmail = typeof formData.get("email") === "string" ? String(formData.get("email")) : null;
  await logFunnel("signup_submit", { email: rawEmail, meta: { invited: Boolean(invite), plan: planIntent, method: "email" } });
  if (!parsed.success) {
    await logFunnel("signup_rejected", { email: rawEmail, reason: "invalid" });
    return { error: parsed.error.issues[0]?.message };
  }
  const variant = heroVariant();

  const supabase = await createClient();

  // Any real address can start a trial; temporary and undeliverable ones are turned away. Invited teammates are
  // vouched for by their manager, but only when the invite token is real.
  const invited = invite ? await inviteExists(invite) : false;
  if (!invited && !isAdminEmail(parsed.data.email)) {
    const check = await validateTrialEmail(parsed.data.email);
    if (!check.ok) {
      await logFunnel("signup_rejected", { email: parsed.data.email, reason: check.reason });
      return { error: check.message };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name ?? "" },
      emailRedirectTo: `${appUrl()}/auth/callback${invite ? `?next=/invite/${invite}` : ""}`,
    },
  });
  if (error) {
    await logFunnel("signup_rejected", { email: parsed.data.email, reason: "auth", meta: { message: error.message } });
    return { error: error.message };
  }
  await track("signup", { invited: Boolean(invite), variant: variant ?? "", plan: planIntent ?? "" }).catch(() => {});
  // The profile row is created by a database trigger on the auth user, so it exists by now.
  if (data.user && process.env.SDRCOACH_DEMO !== "1") {
    const click = await readAdClick();
    await createAdminClient()
      .from("profiles")
      .update({ hero_variant: variant, plan_intent: planIntent, ...click })
      .eq("id", data.user.id)
      .then(({ error: e }) => e && reportError(e, { where: "signup_intent", extra: { userId: data.user?.id } }));
  }

  // Email confirmation off: session exists immediately.
  if (data.session) redirect(invite ? `/invite/${invite}` : "/onboarding");
  return { confirmEmail: parsed.data.email };
}

export interface ResendState {
  sent?: boolean;
  error?: string;
}

/**
 * Sends the sign-up confirmation email again. Supabase limits how often one address can ask, and answers the same
 * way whether or not the address has an account, so this cannot be used to probe accounts.
 */
export async function resendConfirmation(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "That address doesn't look right. Start again from sign-up." };
  const invite = typeof formData.get("invite") === "string" ? String(formData.get("invite")) : "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${appUrl()}/auth/callback${invite ? `?next=/invite/${invite}` : ""}` },
  });
  await logFunnel("signup_resend", { email: parsed.data, meta: { ok: !error } });
  if (error?.status === 429 || /seconds|rate/i.test(error?.message ?? "")) return { error: "We just sent one. Give it a minute, then try again." };
  if (error) return { error: "Couldn't send it just now. Try again in a minute." };
  return { sent: true };
}


/** One Tap signed someone in on the client; record it the same way the other paths are recorded. */
export async function recordOneTap(mode: "login" | "signup" | "karen") {
  if (mode === "karen") return; // the Karen start route logs it
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await logFunnel("signup_submit", { email: user.email, subject: user.id, meta: { method: "one_tap", mode } });
}

/** Google sign-in. New users land on onboarding, where the work-email rule is applied to the Google address. */
export async function signInWithGoogle(formData: FormData) {
  const invite = typeof formData.get("invite") === "string" ? String(formData.get("invite")) : "";
  const next = invite ? `/invite/${invite}` : safeNext(formData.get("next"));
  if (!next.startsWith("/karen")) await logFunnel("signup_submit", { meta: { invited: Boolean(invite), method: "google" } });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

async function inviteExists(token: string) {
  if (process.env.SDRCOACH_DEMO === "1") return true;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient().from("invites").select("id").eq("token", token).is("accepted_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  return Boolean(data);
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.string().email("Enter a valid email") }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
  });
  // Same message whether or not the address exists, so the form cannot be used to probe accounts.
  return { message: "If that address has an account, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ password: z.string().min(8, "Password must be at least 8 characters") }).safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "This reset link has expired. Request a new one." };
  redirect("/dashboard");
}
