import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { ogPath } from "@/lib/og-cards";
import { JsonLd, articleLd, breadcrumbLd } from "@/components/seo/json-ld";
import { CtaBand, Eyebrow, Section } from "@/components/marketing/sections";

const UPDATED = "2026-10-25";
const DESCRIPTION = "What studies say about simulation training, practice and feedback, what they don't say, and how 100 Dials uses them. Every study linked.";

export const metadata = pageMetadata({
  title: "Research: practice, feedback and sales skill",
  description: DESCRIPTION,
  path: "/research",
  card: ["page", "research"],
  article: { publishedTime: UPDATED, modifiedTime: UPDATED, tags: ["sales training research", "deliberate practice", "feedback"] },
});

interface Study {
  heading: string;
  cite: string;
  findings: string;
  useLabel: "How we use it" | "Why it matters for cold calls";
  use: string;
  href?: string;
}

const STUDIES: Study[] = [
  {
    heading: "Practising in a realistic simulation improves skills and behaviour",
    cite: "Cook et al. (2011), JAMA.",
    findings: "A meta-analysis of 609 studies with 35,226 trainees, mostly in healthcare, comparing simulation training with no training. Simulation was linked to large improvements in knowledge and skills, smaller but still clear improvements in on-the-job behaviour, and moderate improvements in outcomes for real patients. Results varied a lot between studies.",
    useLabel: "Why it matters for cold calls",
    use: "This is the strongest evidence that rehearsing a high-stakes conversation in a realistic setting carries over to the real thing. It also shows the effect shrinks at each step, from skill to behaviour to outcome.",
    href: "https://jamanetwork.com/journals/jama/fullarticle/1104300",
  },
  {
    heading: "Simulations work best when people can replay them",
    cite: "Sitzmann (2011), Personnel Psychology.",
    findings: "A meta-analysis of 65 studies with 6,476 trainees using computer-based simulation games. Compared with other groups, trainees showed higher confidence in their skills (about 20%), better practical know-how (about 14%) and better retention (about 9%). Learning was stronger when trainees could replay as often as they wanted, and when the simulation supported other training rather than replacing it. The author reports strong signs of publication bias, so the true effects may be smaller.",
    useLabel: "How we use it",
    use: "Reps can call the same prospect again to try a different approach, and 100 Dials is meant to sit alongside a manager's coaching, not replace it.",
    href: "https://doi.org/10.1111/j.1744-6570.2011.01190.x",
  },
  {
    heading: "Model, practise, get feedback",
    cite: "Taylor, Russ-Eft & Chan (2005), Journal of Applied Psychology.",
    findings: "A meta-analysis of 117 studies of behaviour modelling training: show the skill, let people practise it, give feedback. It reliably improved knowledge and skills. Its effect on actual job behaviour was smaller.",
    useLabel: "How we use it",
    use: "The report names the specific behaviour to fix, and the next call is the practice.",
    href: "https://doi.org/10.1037/0021-9010.90.4.692",
  },
  {
    heading: "Saying it out loud beats reading it",
    cite: "Adesope, Trevisan & Sundararajan (2017), Review of Educational Research.",
    findings: "A meta-analysis of practice testing, actively recalling information rather than re-reading it. Practice tests helped learning more than restudying and every other comparison condition, and the benefit held for applying knowledge in new situations, not just recalling it.",
    useLabel: "How we use it",
    use: "Reps answer objections live, in their own words, instead of memorising a script.",
    href: "https://doi.org/10.3102/0034654316689306",
  },
  {
    heading: "Feedback has to be about the task",
    cite: "Kluger & DeNisi (1996), Psychological Bulletin.",
    findings: "A meta-analysis of 607 effects from over 23,000 observations. Feedback improved performance on average, but in more than a third of cases it made performance worse. Feedback that kept attention on the task helped; feedback that turned attention to the person, for example praise, criticism of the person or comparison with others, tended to hurt.",
    useLabel: "How we use it",
    use: "Reports score specific behaviours and quote what the rep actually said, so the feedback points at the call, not the person.",
    href: "https://doi.org/10.1037/0033-2909.119.2.254",
  },
  {
    heading: "Confidence and performance go together",
    cite: "Stajkovic & Luthans (1998), Psychological Bulletin.",
    findings: "A meta-analysis of 114 studies with more than 21,000 people found a clear positive link between people's belief in their ability to do a task and how well they actually performed it.",
    useLabel: "Why it matters for cold calls",
    use: "Call reluctance is common in new SDRs. A place to fail without losing a real lead is one way that belief gets built.",
    href: "https://doi.org/10.1037/0033-2909.124.2.240",
  },
  {
    heading: "Sales training works, and fades",
    cite: "Singh, Sen & Borle (2022), Journal of Marketing Research.",
    findings: "Using data from an online training programme for salespeople, the authors found that training raised sales, but the effect differed between people and regions and faded over time. This was a field study, not a randomised experiment.",
    useLabel: "How we use it",
    use: "Plans include a monthly call allowance, because short, regular practice matches this better than a single workshop.",
    href: "https://doi.org/10.1177/00222437211031358",
  },
];

const WEAKER = [
  "Judge-scored role-plays don't always predict live results. In a study of about 56 university sales students, scores in a judged role-play did not predict their real meetings or closed deals (Dover, Freling & Forbes, Journal of Selling, 2025). Small sample, one university, but it suggests theatrical role-play isn't the same as realistic call practice.",
  "Practice isn't everything. A meta-analysis of 88 studies found deliberate practice explained a much smaller share of performance differences in professional work than in games, music or sport (Macnamara, Hambrick & Oswald, Psychological Science, 2014). Practice helps; it isn't the whole story.",
  "Most studies are not about cold calling. The strongest evidence comes from healthcare and workplace training generally. We use it because the mechanism (rehearse, get feedback, repeat) is the same, not because these studies tested sales calls.",
];

const REFERENCES = [
  "Cook DA, Hatala R, Brydges R, et al. Technology-enhanced simulation for health professions education: a systematic review and meta-analysis. JAMA. 2011;306(9):978–988.",
  "Sitzmann T. A meta-analytic examination of the instructional effectiveness of computer-based simulation games. Personnel Psychology. 2011;64(2):489–528.",
  "Taylor PJ, Russ-Eft DF, Chan DWL. A meta-analytic review of behavior modeling training. Journal of Applied Psychology. 2005;90(4):692–709.",
  "Adesope OO, Trevisan DA, Sundararajan N. Rethinking the use of tests: a meta-analysis of practice testing. Review of Educational Research. 2017;87(3):659–701.",
  "Kluger AN, DeNisi A. The effects of feedback interventions on performance: a historical review, a meta-analysis, and a preliminary feedback intervention theory. Psychological Bulletin. 1996;119(2):254–284.",
  "Stajkovic AD, Luthans F. Self-efficacy and work-related performance: a meta-analysis. Psychological Bulletin. 1998;124(2):240–261.",
  "Singh SS, Sen R, Borle S. Online training of salespeople: impact, heterogeneity, and spillover effects. Journal of Marketing Research. 2022;59(1):230–249.",
  "Dover HF, Freling RE, Forbes LP. Beyond the script: assessing the effectiveness of sales role-plays in developing selling skills. Journal of Selling. 2025;25(1):77–90.",
  "Macnamara BN, Hambrick DZ, Oswald FL. Deliberate practice and performance in music, games, sports, education, and professions: a meta-analysis. Psychological Science. 2014;25(8):1608–1618.",
];

export default function ResearchPage() {
  return (
    <>
      <JsonLd
        data={[
          articleLd({ title: "The research behind 100 Dials", description: DESCRIPTION, slug: "research", path: "/research", date: UPDATED, updated: UPDATED, author: "100 Dials", image: ogPath("page", "research", SITE.contentUpdated) }),
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Research", path: "/research" }]),
        ]}
      />
      <Section className="pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Research</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">The research behind 100 Dials</h1>
          <p className="text-muted-foreground mt-3 text-xs">Last updated 25 October 2026</p>
          <p className="text-muted-foreground mt-6 text-lg">100 Dials is AI cold-call practice: reps call realistic AI prospects and get a scored report after every call. This page sets out the research we built it on, including where that research is limited.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="bg-card rounded-2xl border p-5">
              <div className="font-medium">What these studies show</div>
              <p className="text-muted-foreground mt-2 text-sm">Realistic practice with specific feedback reliably improves skills, and some of that improvement carries over to real-world performance.</p>
            </div>
            <div className="bg-card rounded-2xl border p-5">
              <div className="font-medium">What they don't show</div>
              <p className="text-muted-foreground mt-2 text-sm">That 100 Dials, or any practice tool, guarantees more meetings or faster ramp. None of the studies below tested 100 Dials. When we have data from our own customers, we'll publish it here separately.</p>
            </div>
          </div>

          <ol className="mt-14 space-y-12">
            {STUDIES.map((s, i) => (
              <li key={s.heading} id={`study-${i + 1}`}>
                <h2 className="font-display text-3xl leading-tight text-balance">
                  <span className="text-muted-foreground mr-3 text-xl">{i + 1}.</span>
                  {s.heading}
                </h2>
                <p className="text-body mt-4"><span className="font-medium">{s.cite}</span> {s.findings}</p>
                <p className="text-muted-foreground text-body mt-3"><span className="text-foreground font-medium">{s.useLabel}:</span> {s.use}</p>
                {s.href && <a href={s.href} className="mt-3 inline-block text-sm underline underline-offset-4" rel="noopener" target="_blank">Read the study</a>}
              </li>
            ))}
          </ol>

          <h2 className="font-display mt-16 text-3xl">Where the evidence is weaker</h2>
          <p className="text-muted-foreground mt-3">We think it's worth being clear about these too.</p>
          <ul className="mt-5 space-y-4">
            {WEAKER.map((w) => (
              <li key={w} className="flex gap-3 text-body">
                <span className="bg-signal mt-2.5 size-1.5 shrink-0 rounded-full" />
                <span>{w}</span>
              </li>
            ))}
          </ul>

          <h2 className="font-display mt-16 text-3xl">Industry data</h2>
          <p className="text-muted-foreground mt-3">Not peer-reviewed, but useful for what to practise.</p>
          <p className="text-body mt-4">
            Gong's analysis of cold calls found that reps who stated a clear reason for calling had 2.1x the success rate of those who didn't, and that opening with “Did I catch you at a bad time?” was linked to fewer meetings. Gong doesn't publish its method or sample sizes. “Reason for call” is one of the six skills every 100 Dials report scores.{" "}
            <a href="https://www.gong.io/blog/cold-call-stats" className="underline underline-offset-4" rel="noopener" target="_blank">Gong cold call stats</a>
          </p>

          <h2 className="font-display mt-16 text-3xl">A statistic we don't use</h2>
          <p className="text-body mt-4">You'll often see “84% of sales training is forgotten within 90 days.” We couldn't find a primary source for it. The forgetting curve it's usually linked to comes from Hermann Ebbinghaus memorising nonsense syllables in the 1880s, which says little about sales skills.</p>

          <h2 className="font-display mt-16 text-3xl">Full references</h2>
          <ol className="text-muted-foreground mt-5 list-decimal space-y-2 pl-5 text-sm">
            {REFERENCES.map((r) => <li key={r}>{r}</li>)}
          </ol>

          <p className="text-muted-foreground mt-12 text-sm">
            See the method in practice: <Link href="/karen" className="text-foreground underline underline-offset-4">call Karen</Link> and read the report, or see <Link href="/for-managers" className="text-foreground underline underline-offset-4">how managers use it</Link>.
          </p>
        </div>
      </Section>
      <CtaBand title="Rehearse, get feedback, repeat." body="Ten free calls, no card. Every one comes back scored on the six skills." secondary={{ href: "/karen", label: "Call Karen first" }} />
    </>
  );
}
