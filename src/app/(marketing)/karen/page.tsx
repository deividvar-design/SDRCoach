import type { Metadata } from "next";
import { KAREN } from "@/lib/demo/boss";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { ChallengeForm } from "./challenge-form";

export const metadata: Metadata = {
  title: "Can you survive Karen? A cold call you will not forget",
  description: "Dial Karen Whitlock, Head of Procurement, the rudest prospect we could build. Three minutes, no account, a scored report after. Work email only.",
  alternates: { canonical: "/karen" }, openGraph: { url: "/karen" },
};

export default function KarenPage() {
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <Eyebrow>Boss fight, no account needed</Eyebrow>
            <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Can you survive Karen?</h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg">
              {KAREN.name} is {KAREN.title} at {KAREN.company}. Twenty-two years in procurement. She does not take cold calls, she wants your manager's name, and she is making a note of this. You have three minutes and one shot.
            </p>
            <ul className="mt-8 space-y-3">
              {KAREN.objections.slice(0, 3).map((line) => (
                <li key={line} className="flex gap-3 text-sm">
                  <span className="bg-signal mt-2 size-1.5 shrink-0 rounded-full" />
                  <span className="text-muted-foreground">“{line}”</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-8 max-w-xl text-sm">
              She is an AI prospect, the same kind our customers' reps dial every day, turned up to eleven. After the call, our coach scores your opener, reason for call, discovery, objection handling, value and close, and emails you the report. Nobody is expected to book her. Staying composed is the win.
            </p>
          </div>
          <ChallengeForm />
        </div>
      </Section>
    </>
  );
}
