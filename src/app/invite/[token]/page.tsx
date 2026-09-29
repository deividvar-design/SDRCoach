import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { isPast } from "@/lib/utils";
import { AcceptForm } from "./accept-form";

/** Landing for invite links. Signed out → signup carrying the token. Signed in → confirm, then join. */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/signup?invite=${encodeURIComponent(token)}`);

  // Only the workspace name and the invited address are read here; joining happens in the action.
  const { data: invite } = await createAdminClient()
    .from("invites")
    .select("email, role, expires_at, accepted_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();
  const valid = invite && !invite.accepted_at && !isPast(invite.expires_at);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Logo />
        {valid ? (
          <>
            <div>
              <h1 className="font-display text-3xl">Join {invite.organizations?.name ?? "the workspace"}</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                You were invited as {invite.role === "manager" ? "a manager" : "a rep"}, using {invite.email}. You are signed in as {user.email}.
              </p>
            </div>
            <AcceptForm token={token} orgName={invite.organizations?.name ?? "the workspace"} email={user.email ?? ""} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">This invite is no longer valid</h1>
            <p className="text-muted-foreground text-sm">Ask your manager to send a fresh one.</p>
          </>
        )}
        <Link href="/dashboard" className="text-muted-foreground block text-sm underline underline-offset-4">Go to your workspace</Link>
      </div>
    </main>
  );
}
