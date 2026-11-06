import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { Eyebrow, H2, Section } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { PARTNER, PARTNER_ASKS, PARTNER_FIT, PARTNER_GETS } from "@/content/founding-partners";
import { spotsLeft } from "@/lib/partners/program";
import { ApplyForm } from "./apply-form";

export const metadata = pageMetadata({
  title: "Founding partners: a 30-day pilot for SDR teams",
  description: `Ten SDR teams get a ${PARTNER.pilotDays}-day pilot of 100 Dials, set up from their own website, with ${PARTNER.callsPerRep} scored practice calls per rep. In return: they start within a week, use it, and let us publish the results they approve.`,
  path: "/founding-partners",
  card: ["page", "founding-partners"],
});
// The spots counter reads the database on each request, so it is never stale and never invented.
export const dynamic = "force-dynamic";

const STEPS: [string, string][] = [
  ["Apply", "Two minutes: your team, your website, when you can start."],
  ["We reply within two working days", "If it's a fit, you get a link to a workspace already built from your website: what you sell, who you sell to, and a first prospect from your target accounts."],
  ["Your reps dial", `Invite them from the Team page. ${PARTNER.callsPerRepPerWeek} calls a week each, every call scored on six skills with the one thing to fix.`],
  ["Day 30: the report", "How your team's scores moved from the first week to the last, from your own calls. You approve what we publish, word for word."],
];

const FAQ: [string, string][] = [
  ["What does the pilot cost?", `Nothing, and no card. ${PARTNER.pilotDays} days and ${PARTNER.callsPerRep} calls per rep for up to ${PARTNER.maxReps} reps. If you stay on after the pilot, you pay the founding price, locked for ${PARTNER.priceLockMonths} months.`],
  ["What exactly do you publish?", "Your company name and logo, a quote from you, and the day-30 numbers from your own calls: average score in the first week against the last, and calls per rep. You see the exact wording and numbers first, and nothing goes out until you approve it."],
  ["Why is publishing part of the deal?", "Because that is what the pilot is for on our side. We are trading a set-up workspace, the calls and the price for proof from real teams. If you can't put your name to a result, the regular free trial is a better fit."],
  ["What if we can't start in time?", `If nobody has made a call ${PARTNER.releaseAfterDays} days after you open the workspace, the spot goes to the next team on the list. Your workspace and its calls stay open until the pilot ends.`],
  ["Do we have to get on a call?", "No. The pilot runs by email and in the product. If you want a 15-minute kickoff, tick the box in the form and say when suits you."],
  ["We have one or two SDRs. Can we join?", `The pilot is for teams of ${PARTNER.minReps} or more. Smaller teams can start the regular free trial today: ten calls over two weeks.`],
];

export default async function FoundingPartnersPage() {
  const left = await spotsLeft();
  return (
    <>
      <JsonLd data={faqLd(FAQ.map(([q, a]) => ({ q, a })))} />
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>Founding partners</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Ten SDR teams. A {PARTNER.pilotDays}{"\u2011"}day pilot we set up for you.</h1>
          <p className="text-muted-foreground mt-6 text-lg text-balance">
            We build your workspace from your website, your reps practise cold calls on AI prospects modelled on your real buyers, and every call is scored. In return, you start within a week, actually use it, and let us publish the results you approve.
          </p>
          <p className="mt-6 text-lg">
            <span className="font-medium">{left} of {PARTNER.spots} spots open.</span>{" "}
            <Link href="#apply" className="underline underline-offset-4">Apply below</Link>
          </p>
        </div>
      </Section>

      <Section className="border-t">
        <div className="grid gap-6 md:grid-cols-2">
          <Terms title="What you get" items={PARTNER_GETS} />
          <Terms title="What we ask" items={PARTNER_ASKS} />
        </div>
        <div className="mt-6 rounded-2xl border p-6 md:p-8">
          <h2 className="font-medium">Who it&apos;s for</h2>
          <ul className="text-muted-foreground mt-3 space-y-2">
            {PARTNER_FIT.map((f) => <li key={f} className="flex gap-3"><span className="bg-signal mt-2.5 size-1.5 shrink-0 rounded-full" />{f}</li>)}
          </ul>
        </div>
      </Section>

      <Section className="border-t">
        <H2>How the {PARTNER.pilotDays} days run.</H2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <div className="text-muted-foreground font-mono text-sm tabular">{i + 1}</div>
              <div className="mt-2 font-medium">{title}</div>
              <p className="text-muted-foreground mt-1 text-sm">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="apply" className="border-t">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <H2>Apply for a spot.</H2>
            <p className="text-muted-foreground mt-4">We read every application. Teams that can start soonest go first. Not sure yet? <Link href="/karen" className="text-foreground underline underline-offset-4">Call Karen</Link> to hear what your reps would be practising against, or read the <Link href="/sample-report" className="text-foreground underline underline-offset-4">sample report</Link>.</p>
          </div>
          <ApplyForm spotsLeft={left} />
        </div>
      </Section>

      <Section className="border-t">
        <H2>Questions.</H2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="rounded-2xl border p-6">
              <dt className="font-medium">{q}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

function Terms({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="bg-card rounded-2xl border p-6 md:p-8">
      <h2 className="font-display text-3xl">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((t) => <li key={t} className="flex gap-3"><span className="bg-signal mt-2.5 size-1.5 shrink-0 rounded-full" /><span>{t}</span></li>)}
      </ul>
    </div>
  );
}
