import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KAREN } from "@/lib/demo/boss";
import { coachLine, publicScorecard, survivedLabel } from "@/lib/demo/share";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import { RUBRIC, type RubricKey } from "@/lib/scoring/rubric";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ShareButton } from "../../share-button";

export const dynamic = "force-dynamic";

function who(card: { display_name: string | null; display_company: string | null }) {
  if (!card.display_name) return "A rep";
  return card.display_company ? `${card.display_name} from ${card.display_company}` : card.display_name;
}

export async function generateMetadata({ params }: PageProps<"/karen/score/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const card = await publicScorecard(slug);
  if (!card) return { title: "Scorecard not found", robots: { index: false, follow: false } };
  const survived = survivedLabel(card.duration_seconds);
  return {
    title: `${who(card)} survived Karen for ${survived}`,
    description: coachLine(card.score?.coach_summary) || `${Number(card.overall ?? 0).toFixed(1)} out of 10 against the rudest prospect we could build.`,
    // Shared on purpose, but thin on its own: previews work, search ignores them.
    robots: { index: false, follow: true },
    openGraph: { url: `/karen/score/${slug}`, type: "article" },
  };
}

export default async function ScorecardPage({ params }: PageProps<"/karen/score/[slug]">) {
  const { slug } = await params;
  const card = await publicScorecard(slug);
  if (!card) notFound();
  const survived = survivedLabel(card.duration_seconds);
  const line = coachLine(card.score?.coach_summary);
  const won = card.outcome === "meeting_booked" || card.outcome === "callback";

  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Boss fight scorecard</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">{who(card)} survived Karen for {survived}.</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {KAREN.name}, {KAREN.title}. <span className="text-foreground">{OUTCOME_TEXT[card.outcome ?? ""] ?? "Ended"}.</span> {card.outcome_reason}
        </p>

        <div className="stage text-paper mt-10 grid gap-6 rounded-3xl p-6 md:grid-cols-3 md:p-8">
          <div>
            <div className="dial text-paper/60 text-[11px]">TIME ON THE LINE</div>
            <div className="dial mt-1 text-5xl md:text-6xl">{survived}</div>
          </div>
          <div>
            <div className="dial text-paper/60 text-[11px]">COACH'S SCORE</div>
            <div className="font-display mt-1 text-5xl md:text-6xl">{Number(card.overall ?? 0).toFixed(1)}<span className="text-paper/60 text-xl"> / 10</span></div>
          </div>
          <div>
            <div className="dial text-paper/60 text-[11px]">RESULT</div>
            <div className="font-display mt-1 text-3xl leading-tight">{won ? "Karen gave in." : "Karen won."}</div>
          </div>
        </div>

        {line && <p className="font-display mt-8 text-2xl leading-snug md:text-3xl">“{line}”</p>}

        {card.score && (
          <dl className="bg-card mt-8 grid gap-x-8 rounded-2xl border px-6 sm:grid-cols-2">
            {(Object.keys(RUBRIC) as RubricKey[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 border-b py-3 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <dt className="text-sm">{RUBRIC[k].label}</dt>
                <dd className="tabular font-medium">{card.score!.dimensions[k].score}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button size="lg" variant="signal" asChild><Link href="/karen">Try to beat it</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/karen/leaderboard">This month's leaderboard</Link></Button>
          <ShareButton path={`/karen/score/${slug}`} survived={survived} score={Number(card.overall ?? 0)} />
        </div>
        <p className="text-muted-foreground mt-6 text-sm">Karen is a boss fight inside 100 Dials, where new SDRs get their hard calls in before they get them on real prospects. Three minutes, a work email, no account.</p>
      </div>
    </Section>
  );
}
