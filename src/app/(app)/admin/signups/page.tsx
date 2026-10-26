import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/paginate";
import { reasonLabel, SIGNUP_REASONS } from "@/lib/marketing/signup-intent";
import { daysAgoIso, formatDate } from "@/lib/utils";
import { likeTerm, parseList, type SearchParams } from "@/lib/admin/list";
import { ListToolbar, Pager } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Signups" };
export const dynamic = "force-dynamic";

const PATH = "/admin/signups";
const PLANS = ["trial", "starter", "team", "enterprise", "canceled"];
const FILTERS = [
  { key: "source", label: "Source", options: [{ value: "ads", label: "Google Ads" }, { value: "direct", label: "Direct" }] },
  { key: "dialed", label: "Dialed", options: [{ value: "yes", label: "At least once" }, { value: "no", label: "Never" }] },
  { key: "plan", label: "Plan", options: [...PLANS.map((p) => ({ value: p, label: p })), { value: "none", label: "No workspace" }] },
  { key: "reason", label: "Why here", options: SIGNUP_REASONS.map((r) => ({ value: r.id, label: r.label })) },
];

const PROVIDER_LABEL: Record<string, string> = { google: "Google sign-in", email: "Email" };

/** Everyone who created an account: where they came from, what they said they came for, and whether they dialed. */
export default async function SignupsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const state = parseList(await searchParams, FILTERS.map((f) => f.key));
  const db = createAdminClient();

  // Workspace and call facts are small tables keyed by user; load them once and filter by id lists.
  const [memberships, callers] = await Promise.all([
    fetchAll((a, b) => db.from("memberships").select("user_id, role, org_id, organizations(name, trial_domain, plan)").range(a, b)),
    fetchAll((a, b) => db.from("call_sessions").select("user_id").not("started_at", "is", null).range(a, b)),
  ]);
  const orgOf = new Map(memberships.map((m) => [m.user_id, m]));
  const callsBy = new Map<string, number>();
  for (const c of callers) callsBy.set(c.user_id, (callsBy.get(c.user_id) ?? 0) + 1);

  let query = db.from("profiles").select("id, full_name, email, signup_reason, signup_goal, hero_variant, plan_intent, phone, gclid, gbraid, wbraid, created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (state.q) {
    const like = likeTerm(state.q.replace(/[(),]/g, " "));
    query = query.or(`email.ilike.${like},full_name.ilike.${like}`);
  }
  const f = state.filters;
  if (f.source === "ads") query = query.or("gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null");
  else if (f.source === "direct") query = query.is("gclid", null).is("gbraid", null).is("wbraid", null);
  if (f.dialed === "yes") query = query.in("id", [...callsBy.keys()]);
  else if (f.dialed === "no" && callsBy.size) query = query.not("id", "in", `(${[...callsBy.keys()].join(",")})`);
  if (f.plan === "none") {
    if (orgOf.size) query = query.not("id", "in", `(${[...orgOf.keys()].join(",")})`);
  } else if (f.plan && PLANS.includes(f.plan)) {
    const ids = memberships.filter((m) => (m.organizations as { plan?: string } | null)?.plan === f.plan).map((m) => m.user_id);
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (f.reason) query = query.eq("signup_reason", f.reason);

  const [{ data: profiles, count }, { count: total }, { count: week }, { count: ramping }, { count: karen }] = await Promise.all([
    query.range(state.from, state.to),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", daysAgoIso(7)),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("signup_reason", "ramping"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("signup_reason", "karen"),
  ]);
  const rows = profiles ?? [];

  // How each account on this page signed in: the funnel log where it exists, else the auth record (one lookup per
  // older account; the page is at most 50 rows).
  const providers = new Map<string, string>();
  if (rows.length) {
    const { data: events } = await db.from("funnel_events").select("subject, meta").eq("kind", "signup_completed").in("subject", rows.map((r) => r.id));
    for (const e of events ?? []) {
      const p = (e.meta as { provider?: string } | null)?.provider;
      if (e.subject && p) providers.set(e.subject, p);
    }
    await Promise.all(
      rows
        .filter((r) => !providers.has(r.id))
        .map(async (r) => {
          const { data } = await db.auth.admin.getUserById(r.id);
          const p = data.user?.app_metadata?.provider;
          if (typeof p === "string") providers.set(r.id, p);
        }),
    );
  }
  const dialedTotal = callsBy.size;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal" title="Signups" description="Every account: where they came from, why they said they came, and whether they have dialed." actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Accounts" value={total ?? 0} hint={`${week ?? 0} in the last 7 days`} />
        <StatTile label="Dialed at least once" value={dialedTotal} hint={total ? `${Math.round((dialedTotal / total) * 100)}% of accounts` : "—"} />
        <StatTile label="Ramping new SDRs" value={ramping ?? 0} hint={`${karen ?? 0} just want to fight Karen`} />
      </div>
      <section className="bg-card rounded-2xl border">
        <ListToolbar path={PATH} state={state} filters={FILTERS} placeholder="Name or email" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Why here</TableHead>
              <TableHead>Worth paying for</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead>Signed up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">{total ? "Nothing matches these filters." : "No accounts yet."}</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const m = orgOf.get(r.id);
                const org = m?.organizations as { name: string; trial_domain: string | null; plan: string } | null | undefined;
                const ad = Boolean(r.gclid || r.gbraid || r.wbraid);
                const provider = providers.get(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">{r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : "—"}{r.phone ? ` · ${r.phone}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{org?.name ?? "—"}{m?.role ? <span className="text-muted-foreground"> · {m.role}</span> : null}</div>
                      <div className="text-muted-foreground text-xs">{org?.trial_domain ?? ""}{org?.plan ? ` · ${org.plan}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad ? "success" : "outline"}>{ad ? "Google Ads" : "Direct"}</Badge>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {provider ? PROVIDER_LABEL[provider] ?? provider : "—"}
                        {r.plan_intent ? ` · wanted ${r.plan_intent.replace(":", ", ")}` : ""}
                        {r.hero_variant ? ` · hero ${r.hero_variant}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{reasonLabel(r.signup_reason) ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs">{r.signup_goal ?? "—"}</TableCell>
                    <TableCell className="tabular text-right">{callsBy.get(r.id) ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(r.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Pager path={PATH} state={state} total={count ?? 0} />
      </section>
    </div>
  );
}
