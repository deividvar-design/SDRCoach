import Link from "next/link";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";

/**
 * Three findings about practice and feedback as a method, each with how the product is built around it. Claims are
 * about the method, never about results 100 Dials has measured; the research page carries the sources and the limits.
 */
const CARDS = [
  {
    heading: "Rehearsal carries over to the real thing",
    body: "In more than 600 studies, people who trained with realistic practice did better than people who didn't, in tests and at work.",
    built: "our prospects push back like real buyers, so practice feels like the real call.",
    source: "Cook et al., JAMA, 2011",
  },
  {
    heading: "Saying it beats reading it",
    body: "Saying an answer out loud from memory helps you learn more than reading it again. It also helps when something new comes up.",
    built: "reps say their opener and answers out loud to someone who talks back. They don't just reread a script.",
    source: "Adesope, Trevisan & Sundararajan, Review of Educational Research, 2017",
  },
  {
    heading: "Feedback works when it's specific",
    body: "Feedback usually helps. But in more than a third of cases it made people worse, mostly when it judged the person instead of the work.",
    built: "every report scores six skills and quotes what the rep said, word for word.",
    source: "Kluger & DeNisi, Psychological Bulletin, 1996",
  },
];

export function ResearchCards() {
  return (
    <Section className="border-t">
      <Eyebrow>Why practice works</Eyebrow>
      <H2>Built on what the research says about practice.</H2>
      <p className="text-muted-foreground text-body mt-4 max-w-2xl">We didn't invent the idea that practice helps. We built the product around the parts the research says matter most.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.heading} className="flex flex-col border-t pt-5">
            <h3 className="text-lg font-medium">{c.heading}</h3>
            <p className="text-muted-foreground text-body mt-3">{c.body}</p>
            <p className="text-body mt-4"><span className="font-medium">So we built it this way:</span> {c.built}</p>
            <p className="text-muted-foreground mt-auto pt-4 text-xs">{c.source}</p>
          </article>
        ))}
      </div>
      <p className="text-muted-foreground mt-10 max-w-3xl text-sm">
        Practice doesn't replace real calls. Training wears off if you stop, so 100 Dials is built for a few practice calls every week. <Link href="/research" className="text-foreground underline underline-offset-4">See the research</Link>
      </p>
    </Section>
  );
}
