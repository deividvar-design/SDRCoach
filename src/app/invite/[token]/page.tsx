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
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-sm space-y-2 text-center">
          <h1 className="text-xl font-semibold">This invite is no longer valid</h1>
          <p className="text-muted-foreground text-sm">Ask your manager to send a fresh one.</p>
        </div>
      </main>
    );
  }
  redirect("/dashboard");
}
