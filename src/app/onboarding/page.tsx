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

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships").select("id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) redirect("/dashboard");

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
