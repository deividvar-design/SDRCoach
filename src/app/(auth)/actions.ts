"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { createClient } from "@/lib/supabase/server";
import { validateBusinessEmail } from "@/lib/email/business";
import { safeNext } from "@/lib/safe-next";
import { isAdminEmail } from "@/lib/auth";
import { appUrl } from "@/lib/site";

export interface AuthState {
  error?: string;
  message?: string;
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
  if (error) return { error: "Wrong email or password." };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ full_name: z.string().min(2, "Tell us your name") })
    .safeParse({ email: formData.get("email"), password: formData.get("password"), full_name: formData.get("full_name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const invite = typeof formData.get("invite") === "string" ? String(formData.get("invite")) : "";

  // Trials are for business addresses. Invited teammates are vouched for by their manager,
  // but only when the invite token is real.
  const invited = invite ? await inviteExists(invite) : false;
  if (!invited && !isAdminEmail(parsed.data.email)) {
    const check = await validateBusinessEmail(parsed.data.email);
    if (!check.ok) return { error: check.message };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${appUrl()}/auth/callback${invite ? `?next=/invite/${invite}` : ""}`,
    },
  });
  if (error) return { error: error.message };
  await track("signup", { invited: Boolean(invite) }).catch(() => {});

  // Email confirmation off: session exists immediately.
  if (data.session) redirect(invite ? `/invite/${invite}` : "/onboarding");
  return { message: "Check your inbox to confirm your email, then sign in." };
}

/** Google sign-in. New users land on onboarding, where the work-email rule is applied to the Google address. */
export async function signInWithGoogle(formData: FormData) {
  const invite = typeof formData.get("invite") === "string" ? String(formData.get("invite")) : "";
  const next = invite ? `/invite/${invite}` : safeNext(formData.get("next"));
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
