import Link from "next/link";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";

/**
 * Three findings about practice and feedback as a method, each with how the product is built around it. Claims are
 * about the method, never about results 100 Dials has measured; the research page carries the sources and the limits.
 */
const CARDS = [
  {
    heading: "Rehearsal carries over to the real thing",
    body: "Across more than 600 studies, people trained in realistic simulations outperformed untrained peers, both in skill tests and in how they behaved on the job.",
    built: "Prospects push back the way real buyers do, so the call you practise is close to the call you'll make.",
    source: "Cook et al., JAMA, 2011",
  },
  {
    heading: "Saying it beats reading it",
    body: "Actively producing an answer from memory beats re-reading the material, and the benefit holds when people face new situations.",
    built: "Reps say the opener and the objection response out loud, to someone who answers back, instead of rereading the script.",
    source: "Adesope, Trevisan & Sundararajan, Review of Educational Research, 2017",
  },
  {
    heading: "Feedback works when it's specific",
    body: "Feedback improves performance on average. But in more than a third of cases it made things worse, mostly when it judged the person instead of the task.",
    built: "Every report scores six behaviours and quotes the rep's own words, so the feedback is about what was said, not about the rep.",
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
        Practice doesn't replace live calls. The gains from sales training are real but fade without repetition, so 100 Dials is built for a few calls a week, not a one-off workshop. <Link href="/research" className="text-foreground underline underline-offset-4">See the research</Link>
      </p>
    </Section>
  );
}
