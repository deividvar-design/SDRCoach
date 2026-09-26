import type { Metadata } from "next";
import { Database, Globe, Lock, ShieldCheck, Trash2, Users } from "lucide-react";
import { CtaBand, Eyebrow, H2, Section } from "@/components/marketing/sections";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trust & security",
  description: "How SDRCoach handles your call recordings, transcripts and team data: EU hosting, per-tenant isolation, no model training on your data, and deletion on request.",
  alternates: { canonical: "/trust" },
};

const PILLARS = [
  { icon: Lock, title: "Your data never trains models", body: "Transcripts and recordings are used only to ground your own team's prospects and grade your own team's calls. We do not train, fine-tune or share models with them. Our AI providers are contractually bound the same way." },
  { icon: Users, title: "Tenant isolation in the database", body: "Every row belongs to one workspace. Access is enforced with row-level security in Postgres, not only in application code. Reps see their own calls. Managers see their workspace. Nobody sees another company's." },
  { icon: Globe, title: "Hosted in the EU", body: "Database, authentication and file storage run in Supabase's Ireland region (AWS eu-west-1). Application servers run on Vercel. Voice and language processing are performed by our subprocessors below." },
  { icon: Database, title: "Encryption", body: "TLS 1.2+ in transit everywhere. Encryption at rest for the database and storage buckets. API keys are never sent to the browser; call tokens are single-use and short-lived." },
  { icon: Trash2, title: "Retention and deletion", body: "Recordings and transcripts are kept while your workspace is active. Delete a call, a source or your workspace and the data is removed, including from subprocessors, within 30 days. Export on request." },
  { icon: ShieldCheck, title: "Access control", body: "Role-based access (owner, manager, rep), invite-only membership, business-email-only signup. SSO for Enterprise. Staff access to customer data is logged and limited to support requests you open." },
];

const SUBPROCESSORS = [
  ["Supabase", "Database, authentication, file storage", "EU (Ireland)"],
  ["Vercel", "Application hosting and edge network", "EU / global edge"],
  ["ElevenLabs", "Real-time voice for the AI prospect, call recordings", "US / EU"],
  ["Anthropic", "Call scoring and transcript digests (no training on inputs)", "US"],
  ["PostHog", "Product analytics (EU cloud), only with cookie consent", "EU (Frankfurt)"],
];

export default function TrustPage() {
  return (
    <>
      <Section className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <Eyebrow>Trust & security</Eyebrow>
          <h1 className="font-display mt-4 text-5xl text-balance md:text-6xl">Your reps' voices and your call library. Handled carefully.</h1>
          <p className="text-muted-foreground mt-6 text-lg text-balance">
            SDRCoach processes voice recordings and sales transcripts, which is sensitive data. This page explains exactly what happens to it. Questions go to <a href={`mailto:${SITE.company.securityEmail}`} className="underline underline-offset-4">{SITE.company.securityEmail}</a>.
          </p>
        </div>
      </Section>

      <Section className="border-t">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-card rounded-2xl border p-6">
              <p.icon className="text-signal size-5" />
              <h2 className="mt-4 font-medium">{p.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-t">
        <Eyebrow>Subprocessors</Eyebrow>
        <H2>Who touches the data, and why.</H2>
        <div className="bg-card mt-8 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/50 text-left text-xs uppercase tracking-wide">
              <tr><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Purpose</th><th className="px-5 py-3">Region</th></tr>
            </thead>
            <tbody className="divide-y">
              {SUBPROCESSORS.map(([n, p, r]) => (
                <tr key={n}><td className="px-5 py-3 font-medium">{n}</td><td className="text-muted-foreground px-5 py-3">{p}</td><td className="px-5 py-3">{r}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">A data processing agreement with standard contractual clauses is available on request for every plan. Enterprise customers can pin voice and language processing to EU regions where the provider supports it.</p>
      </Section>

      <Section className="border-t">
        <Eyebrow>Practices</Eyebrow>
        <H2>What we do, and what we are not yet.</H2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-medium">In place today</h3>
            <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
              <li>Row-level security on every table, verified by automated database advisors</li>
              <li>Secrets in managed environment stores, never in code or the browser</li>
              <li>Webhook signature verification and rate limits on call creation</li>
              <li>Business-email-only trials, one workspace per company domain</li>
              <li>Dependency and vulnerability scanning on every deploy</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium">On the roadmap</h3>
            <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
              <li>SOC 2 Type I, then Type II, once we have paying customers who need it</li>
              <li>SSO (Google, Microsoft, SAML) on Enterprise</li>
              <li>Customer-managed retention windows and automatic purge</li>
              <li>Audit log export</li>
            </ul>
            <p className="text-muted-foreground mt-4 text-sm">We would rather tell you what is not done than have you find out later.</p>
          </div>
        </div>
      </Section>

      <CtaBand title="Try it with a practice persona first." body="No customer data needed for the trial. Upload real calls when you are ready." />
    </>
  );
}
