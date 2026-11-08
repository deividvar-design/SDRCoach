import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { partnerReport, reportSummary } from "@/lib/partners/program";
import { Eyebrow, Section } from "@/components/marketing/sections";
import { CheckinForm } from "./checkin-form";

export const metadata = { title: "Your pilot report", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The manager's day-30 page: the numbers from their own calls, five questions, and the publishing approval. */
export default async function PartnerReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const { data: app } = await createAdminClient().from("partner_applications").select("company, name, report, checkin, quote_approved_at").eq("report_token", token).maybeSingle();
  const report = app ? partnerReport(app) : null;
  if (!app || !report) notFound();
  const answers = app.checkin && typeof app.checkin === "object" && !Array.isArray(app.checkin) ? (app.checkin as Record<string, string>) : {};
  const stats: [string, string][] = [
    ["Scored calls", String(report.calls)],
    ["Reps", String(report.reps)],
    ["First-week average", report.firstWeekAvg === null ? "-" : `${report.firstWeekAvg}`],
    ["Last-week average", report.lastWeekAvg === null ? "-" : `${report.lastWeekAvg}`],
  ];
  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Founding-partner pilot</Eyebrow>
        <h1 className="font-display mt-4 text-5xl text-balance">Thirty days at {app.company}, in numbers.</h1>
        <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border p-4">
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="font-display mt-1 text-4xl tabular">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="text-muted-foreground mt-6 space-y-1">{reportSummary(report).map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="text-muted-foreground mt-2 text-sm">Scores are out of 10, from every scored practice call in your workspace. Boss-fight calls are left out, as they are from every average in the product.</p>
        <h2 className="mt-12 mb-4 text-xl font-medium">Five questions</h2>
        <CheckinForm token={token} company={app.company} answers={answers} approved={Boolean(app.quote_approved_at)} />
      </div>
    </Section>
  );
}
