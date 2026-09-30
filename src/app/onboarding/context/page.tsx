import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { ContextForm } from "./context-form";

export const metadata = { title: "Set up your prospects" };
// Reading a website and drafting the context can take half a minute.
export const maxDuration = 60;

export default async function OnboardingContextPage({ searchParams }: PageProps<"/onboarding/context">) {
  const { site } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("org_id, organizations(name)").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <Logo />
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">Step 2 of 2</div>
          <h1 className="font-display text-4xl">Tell the prospects who you are.</h1>
          <p className="text-muted-foreground text-sm">
            Every AI prospect knows this much about {membership.organizations?.name ?? "your company"}, the same as a real buyer would after a glance at your website. The more specific, the more realistic the objections.
          </p>
        </div>
        <ContextForm site={typeof site === "string" ? site : undefined} />
        <p className="text-muted-foreground text-center text-xs">
          You can edit this any time in Settings.{" "}
          <Link href="/dashboard" className="underline underline-offset-4">Skip for now</Link>
        </p>
      </div>
    </main>
  );
}
