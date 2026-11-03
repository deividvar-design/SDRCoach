import Link from "next/link";
import { openAccessLink } from "@/lib/access/links";
import { Logo } from "@/components/logo";
import { ClaimForm } from "./claim-form";

export const metadata = { title: "Your 100 Dials workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Where an admin-issued access link lands: the account exists the moment a password is chosen. */
export default async function WelcomePage({ params }: PageProps<"/welcome/[token]">) {
  const { token } = await params;
  const link = await openAccessLink(token);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Logo />
        {link ? (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Your workspace is ready, {link.company}.</h1>
              <p className="text-muted-foreground text-sm">
                We set you up with {link.calls} calls over {link.days} days, no card and no signup form.{link.draft ? " Your prospects already know what you sell: choose a password and the first one picks up." : " Choose a password and you are in."}
              </p>
            </div>
            <ClaimForm token={token} email={link.email} />
          </>
        ) : (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">This link is no longer valid.</h1>
            <p className="text-muted-foreground text-sm">It may have been used already or expired. If you already set a password, <Link href="/login" className="underline underline-offset-4">sign in</Link>. Otherwise ask us for a fresh link.</p>
          </div>
        )}
      </div>
    </main>
  );
}
