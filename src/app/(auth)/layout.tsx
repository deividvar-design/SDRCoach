import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <Logo descriptor />
        </Link>
        <div className="relative z-10 max-w-md space-y-4">
          <p className="dial text-muted-foreground text-xs">DIAL 001/100</p>
          <p className="font-display text-4xl text-balance">
            Every rep’s first 100 cold calls, without burning 100 real prospects.
          </p>
          <p className="text-muted-foreground">
            Dial an AI prospect built from your own targets. Get scored on the opener, discovery, objections and the
            close, before the real one picks up.
          </p>
        </div>
        <div className="text-muted-foreground text-xs">© {new Date().getFullYear()} 100 Dials</div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
