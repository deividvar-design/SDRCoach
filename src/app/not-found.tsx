import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div>
        <h1 className="font-display text-4xl">Page not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">The link may be old, or the page moved.</p>
      </div>
      <div className="flex gap-4 text-sm underline underline-offset-4">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
      </div>
    </main>
  );
}
