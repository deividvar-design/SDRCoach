import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { TRIAL } from "@/lib/billing/plans";
import { INVITE_REWARD_CAP, REFERRAL_ACTIVATION_CALLS, REFERRAL_PAID_FALLBACK_CALLS, REFERRED_DISCOUNT, REWARDS, rewardLine } from "@/lib/rewards/config";
import { CtaBand, Eyebrow, H2, Section } from "@/components/marketing/sections";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";

export const metadata = pageMetadata({
  title: "Refer a sales team, get a month free",
  description: `Refer another sales team to 100 Dials: you get a month free when they subscribe, they get ${REFERRED_DISCOUNT.percent}% off for ${REFERRED_DISCOUNT.months} months. Plus extra calls for posts and invited reps.`,
  path: "/refer",
  card: ["page", "refer"],
});

const FAQ: { q: string; a: string }[] = [
  { q: "Where do I find my referral link?", a: "In the app, under Rewards, bottom-left of the sidebar. Every workspace has one. Copy it and send it to a sales manager you know." },
  { q: "What does the referred team get?", a: `${REFERRED_DISCOUNT.percent}% off their first ${REFERRED_DISCOUNT.months} months on any plan, applied automatically at checkout, on top of the ${TRIAL.calls}-call free trial everyone gets.` },
  { q: "What do I get, and when?", a: `${REWARDS.find((r) => r.kind === "referral_trial")!.calls} calls added to your workspace once the team you referred has made ${REFERRAL_ACTIVATION_CALLS} connected calls. When they subscribe, your next month is free if you pay monthly. On a trial, a quarterly or an annual plan you get ${REFERRAL_PAID_FALLBACK_CALLS} calls instead.` },
  { q: "Is there a limit?", a: "No limit on referrals. Each referred team pays out once at each stage. Posts and scorecard shares pay once per workspace; invited reps pay up to five times." },
  { q: "What counts as a post?", a: "A public post on LinkedIn or X, in your own words, that mentions 100 Dials or links to the site. A person reads every link before the calls are added, usually within a working day. Profiles, private posts and posts that only contain a link are not accepted." },
  { q: "Can reps earn rewards too?", a: "Yes. Anyone in a workspace can claim the post rewards, and the calls go into the shared pool. Inviting reps and sharing the referral link is for managers, since they own the Team page." },
  { q: "Do earned calls expire?", a: "On a trial they are added to the trial and expire with it. On a paid plan they stay in your bonus balance and are spent after the month's included calls, so they never shorten a month." },
];

export default function ReferPage() {
  const referral = REWARDS.find((r) => r.kind === "referral_trial")!;
  const posts = REWARDS.filter((r) => r.manual);
  const invite = REWARDS.find((r) => r.kind === "invite_rep")!;
  return (
    <>
      <JsonLd data={faqLd(FAQ)} />
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>Referrals and rewards</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Refer a sales team. You get a month free, they get {REFERRED_DISCOUNT.percent}% off.</h1>
          <p className="text-muted-foreground mt-6 text-lg">Every workspace has a referral link. Send it to a sales manager who is ramping reps. When their team starts practising you get calls; when they subscribe you get a month free. No forms, no payout thresholds, no affiliate dashboard to log in to.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="signal" asChild><Link href="/signup">Start a free trial</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/login?next=/rewards">Get my link</Link></Button>
          </div>
        </div>
      </Section>

      <Section className="border-t">
        <H2>How the referral works.</H2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["Share your link", "It is on the Rewards page in the app. Anyone who opens it and starts a workspace is counted as yours for 90 days."],
            [`They make ${REFERRAL_ACTIVATION_CALLS} calls`, `${referral.calls} calls are added to your workspace. A signup that never dials earns nothing, so there is no point sending it to people who will not use it.`],
            ["They subscribe", `Your next month is free on a monthly plan, or ${REFERRAL_PAID_FALLBACK_CALLS} calls on a trial, quarterly or annual plan. They pay ${REFERRED_DISCOUNT.percent}% less for ${REFERRED_DISCOUNT.months} months.`],
          ].map(([t, b], i) => (
            <li key={t} className="border-t pt-5">
              <div className="text-muted-foreground text-sm tabular">{i + 1}</div>
              <h3 className="mt-2 text-lg font-medium">{t}</h3>
              <p className="text-muted-foreground text-body mt-2">{b}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="border-t">
        <H2>Other ways to earn calls.</H2>
        <p className="text-muted-foreground text-body mt-4 max-w-2xl">Calls cost us well under a dollar each and a real post from a real salesperson is worth far more than that, so the rewards are not shy.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[...posts, invite].map((r) => (
            <div key={r.kind} className="rounded-2xl border p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-medium">{r.title}</h3>
                <span className="bg-muted shrink-0 rounded-full px-3 py-1 text-xs font-medium">+{r.kind === "invite_rep" ? `${r.calls} per rep, up to ${INVITE_REWARD_CAP}` : rewardLine(r.calls, r.trialDays)}</span>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">{r.blurb}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm">Trial days are added on trials only. Post rewards are checked by a person before the calls are added.</p>
      </Section>

      <Section className="border-t">
        <Eyebrow>Questions</Eyebrow>
        <H2>The small print, without the small print.</H2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border p-6">
              <dt className="font-medium">{f.q}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand title="Ten free calls. Then decide." body="Work email, no card. Your referral link is waiting on the Rewards page the moment the workspace exists." secondary={{ href: "/pricing", label: "See pricing" }} />
    </>
  );
}
