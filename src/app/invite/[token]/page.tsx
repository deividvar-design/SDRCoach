import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Landing for invite links. Signed out → signup carrying the token. Signed in → accept and go. */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/signup?invite=${encodeURIComponent(token)}`);

  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    const mismatch = error.message.includes("invite_email_mismatch");
    const seats = error.message.includes("no_seats_left");
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">{mismatch ? "This invite was sent to a different email" : seats ? "This workspace has no free seats" : "This invite is no longer valid"}</h1>
          <p className="text-muted-foreground text-sm">
            {mismatch ? `You are signed in as ${user.email}. Sign in with the invited address, or ask your manager to invite this one.` : seats ? "Ask your manager to add a seat, then open the link again." : "Ask your manager to send a fresh one."}
          </p>
          <a href="/dashboard" className="text-sm underline underline-offset-4">Go to your workspace</a>
        </div>
      </main>
    );
  }
  redirect("/dashboard");
}
