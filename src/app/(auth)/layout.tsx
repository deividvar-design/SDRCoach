import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-3xl font-semibold tracking-tight text-balance">
            Every rep’s first 100 cold calls, without burning 100 real prospects.
          </p>
          <p className="text-muted-foreground">
            Dial an AI prospect built from your own targets. Get scored on the opener, discovery, objections and the
            close, before the real one picks up.
          </p>
        </div>
        <div className="text-muted-foreground text-xs">© {new Date().getFullYear()} SDRCoach</div>
        <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-primary/10 blur-3xl" />
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
