import type { Metadata } from "next";
import Link from "next/link";
import { leaderboard, survivedLabel } from "@/lib/demo/share";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Karen leaderboard: who lasted longest this month",
  description: "The twenty reps who stayed on the line with Karen the longest this month, ranked by time survived. Opt-in only. Three minutes, no account, your turn.",
  alternates: { canonical: "/karen/leaderboard" },
  openGraph: { url: "/karen/leaderboard" },
};
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await leaderboard(20);
  const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>{month}</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Who lasted longest against Karen.</h1>
        <p className="text-muted-foreground mt-4 text-lg">Ranked by time on the line before she hung up or gave in. Only people who asked to be listed are here. Resets on the first of the month.</p>
        {rows.length === 0 ? (
          <div className="bg-card mt-10 rounded-2xl border p-8 text-center">
            <div className="font-display text-3xl">Nobody on the board yet this month.</div>
            <p className="text-muted-foreground mt-2 text-sm">Call her, then put your name down from the results page.</p>
          </div>
        ) : (
          <ol className="bg-card mt-10 divide-y rounded-2xl border">
            {rows.map((r, i) => (
              <li key={r.share_slug ?? i} className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-4 px-6 py-4">
                <span className="dial text-muted-foreground text-sm">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="font-medium">{r.display_name ?? "A rep"}</div>
                  {r.display_company && <div className="text-muted-foreground text-xs">{r.display_company}</div>}
                </div>
                <span className="dial text-xl">{survivedLabel(r.duration_seconds)}</span>
                <span className="tabular text-muted-foreground w-12 text-right text-sm">{Number(r.overall ?? 0).toFixed(1)}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" variant="signal" asChild><Link href="/karen">Fight Karen</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/signup">Start free trial</Link></Button>
        </div>
      </div>
    </Section>
  );
}
