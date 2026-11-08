import type { Metadata } from "next";
import { Glow } from "@/components/marketing/glow";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { leaderboard, survivedLabel } from "@/lib/demo/share";
import { Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/score-pill";
import { cn } from "@/lib/utils";

/** Indexable only once someone is on it; an empty board is not worth a result. */
export async function generateMetadata(): Promise<Metadata> {
  const rows = await leaderboard(1).catch(() => []);
  return pageMetadata({
    title: "Karen leaderboard: who lasted longest this month",
    description: "The twenty reps who stayed on the line with Karen the longest this month, ranked by time survived. Opt-in only. Three minutes, no account, your turn.",
    path: "/karen/leaderboard",
    card: ["page", "leaderboard"],
    noindex: rows.length === 0,
  });
}
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await leaderboard(20);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date());
  return (
    <>
      <Glow>
        <Section className="pt-14 md:pt-20">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-5xl text-balance md:text-6xl">Who lasted longest against Karen in {month}.</h1>
            <p className="text-muted-foreground mt-4 text-lg">Ranked by time on the line before she hung up or gave in. Only people who asked to be listed are here. Resets on the first of the month.</p>
          </div>
        </Section>
      </Glow>
      <Section className="pt-10 md:pt-14">
        <div className="mx-auto max-w-3xl">
          {rows.length === 0 ? (
            <div className="bg-card rounded-[18px] border p-8 text-center">
              <div className="font-display text-3xl">Nobody on the board yet this month.</div>
              <p className="text-muted-foreground mt-2 text-sm">Call her, then put your name down from the results page.</p>
            </div>
          ) : (
            <div className="bg-card overflow-hidden rounded-[18px] border">
              <div className="text-muted-foreground grid grid-cols-[2.5rem_1fr_auto_4rem] items-center gap-4 border-b px-6 py-3 text-[13px]">
                <span>#</span>
                <span>Rep</span>
                <span className="text-right">Time on the line</span>
                <span className="text-right">Score</span>
              </div>
              <ol className="divide-y">
                {rows.map((r, i) => (
                  <li key={r.share_slug ?? i} className={cn("grid grid-cols-[2.5rem_1fr_auto_4rem] items-center gap-4 px-6 py-4", i < 3 && "bg-signal/[0.06]")}>
                    <span className={cn("text-sm font-semibold tabular-nums", i < 3 ? "text-signal-ink" : "text-muted-foreground")}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold">{r.display_name ?? "A rep"}</div>
                      {r.display_company && <div className="text-muted-foreground truncate text-[13px]">{r.display_company}</div>}
                    </div>
                    <span className="text-right text-2xl font-semibold tracking-[-0.02em] tabular-nums">{survivedLabel(r.duration_seconds)}</span>
                    <span className="text-right"><ScorePill value={Number(r.overall ?? 0)} className="h-7 min-w-[42px] items-center justify-center rounded-lg px-2 text-sm font-semibold" /></span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="signal" asChild><Link href="/karen">Fight Karen</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/signup">Start free trial</Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
