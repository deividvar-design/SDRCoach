import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { AdsConversion } from "@/components/analytics/ads-conversion";
import { logFunnel } from "@/lib/funnel";
import { readAdClick } from "@/lib/ads/click";
import { reportError } from "@/lib/sentry";
import { OnboardingForm } from "./onboarding-form";
import { classifyEmailDomain } from "@/lib/email/business";
import { isAdminEmail } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships").select("id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) redirect("/dashboard");

  // A personal Google account can sign in but cannot own a trial workspace. Say so now, with a way on.
  const listed = user.email ? classifyEmailDomain(user.email) : null;
  if (user.email && listed && !listed.ok && listed.reason === "free" && !isAdminEmail(user.email)) {
    await logFunnel("signup_rejected", { email: user.email, subject: user.id, reason: "free", dedupeKey: `signup_rejected_free:${user.id}`, meta: { step: "onboarding" } });
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <Logo />
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">That's a personal Google account.</h1>
              <p className="text-muted-foreground text-sm">You're signed in as {user.email}. The trial creates a workspace for your company, so it has to start from a work account.</p>
            </div>
            <div className="bg-card space-y-2 rounded-2xl border p-5">
              <div className="font-medium">Try Karen now</div>
              <p className="text-muted-foreground text-sm">One free three-minute cold call against our rudest AI prospect, scored, with this address.</p>
              <Button variant="signal" className="w-full" asChild><Link href="/karen">Call Karen</Link></Button>
            </div>
            <form action="/auth/signout" method="post" className="bg-card space-y-2 rounded-2xl border p-5">
              <div className="font-medium">Use your work account</div>
              <p className="text-muted-foreground text-sm">Sign out, then continue with your company Google account or work email.</p>
              <Button type="submit" variant="outline" className="w-full">Sign out and switch</Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // The account exists and the person is here: that is the completed signup, whichever way they came in.
  await logFunnel("signup_completed", { email: user.email, subject: user.id, dedupeKey: `signup_completed:${user.id}`, meta: { provider: user.app_metadata?.provider ?? "email" } });
  if (process.env.SDRCOACH_DEMO !== "1") {
    const [click, jar] = await Promise.all([readAdClick(), cookies()]);
    const planIntent = jar.get("plan_intent")?.value ?? null;
    const patch: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null; plan_intent?: string | null } = {};
    if (click.gclid || click.gbraid || click.wbraid) Object.assign(patch, click);
    if (planIntent && /^(starter|team):(month|quarter|year)$/.test(planIntent)) patch.plan_intent = planIntent;
    if (Object.keys(patch).length) {
      const { error } = await createAdminClient().from("profiles").update(patch).eq("id", user.id);
      if (error) reportError(new Error(error.message), { where: "onboarding_attribution", extra: { userId: user.id } });
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AdsConversion kind="signup" id={user.id} email={user.email} />
      <div className="w-full max-w-md space-y-8">
        <Logo />
        <OnboardingForm />
      </div>
    </main>
  );
}
