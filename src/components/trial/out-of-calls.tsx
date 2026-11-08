import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialCallCount } from "@/lib/billing/usage";
import { trialStatus } from "@/lib/billing/trial";
import { repStats } from "@/lib/trial/stats";
import { absoluteUrl } from "@/lib/site";
import { dateFormatter } from "@/lib/tz";
import { EXTENSION } from "@/content/trial-growth";
import { OutOfCallsCards, type CardsProps } from "./out-of-calls-cards";

const DAY = 86_400_000;

/** Pending, in the week after a decision, or open to a new request. */
function extensionState(request: { status: string; created_at: string; decided_at: string | null } | null, fmtDate: (iso: string) => string): CardsProps["extension"] {
  if (request?.status === "pending") return { state: "pending", since: fmtDate(request.created_at) };
  const decided = request?.decided_at ? new Date(request.decided_at).getTime() : null;
  if (decided !== null && Date.now() - decided < EXTENSION.cooldownDays * DAY) return { state: "cooldown", until: fmtDate(new Date(decided + EXTENSION.cooldownDays * DAY).toISOString()) };
  return { state: "open" };
}

/**
 * The screen a trial sees once its calls are gone: how the rep did, then three ways forward side by side. Renders
 * nothing while the trial still has calls, so it can sit on the report and practice pages unconditionally.
 */
export async function OutOfCalls({ viewer, lastCall = false }: { viewer: Viewer; lastCall?: boolean }) {
  if (viewer.org.plan !== "trial") return null;
  const db = createAdminClient();
  const trial = trialStatus(viewer.org, await trialCallCount(viewer.org.id));
  if (!trial.exhausted) return null;

  const fmtDate = await dateFormatter();
  const [stats, { data: request }, { data: intros }] = await Promise.all([
    repStats(db, viewer.org.id, viewer.userId),
    db.from("trial_extension_requests").select("status, created_at, decided_at").eq("org_id", viewer.org.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("manager_intros").select("manager_name, sent_at").eq("user_id", viewer.userId).not("sent_at", "is", null).order("created_at"),
  ]);
  const extension = extensionState(request, fmtDate);
  const repName = viewer.profile.full_name || viewer.email;
  const headline = lastCall ? "That was your last free call." : trial.reason === "time" ? "Your trial's two weeks are up." : "Your free calls are used up.";
  const progress = stats.firstAvg !== null && stats.lastAvg !== null && stats.calls > 1 ? ` Here's how it went: ${stats.firstAvg} → ${stats.lastAvg}.` : stats.lastAvg !== null ? ` Your last score: ${stats.lastAvg}.` : "";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">{headline}<span className="text-muted-foreground font-normal">{progress}</span></h2>
        <p className="text-muted-foreground text-sm">Your targets, calls and scores stay. Three ways to keep going:</p>
      </div>
      <OutOfCallsCards
        extension={extension}
        intros={{ sentTo: (intros ?? []).map((i) => ({ name: i.manager_name.split(/\s+/)[0] ?? i.manager_name, date: fmtDate(i.sent_at!) })) }}
        preview={{ repName, repEmail: viewer.email, orgName: viewer.org.name, stats, link: absoluteUrl("/for-managers") }}
      />
      <p className="text-muted-foreground text-sm">Or get the team on it: <Link href="/upgrade" className="text-foreground underline underline-offset-4">see pricing →</Link></p>
    </section>
  );
}
