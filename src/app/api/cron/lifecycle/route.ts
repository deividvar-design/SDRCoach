import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { sweepStaleSessions } from "@/lib/calls/sweep";

export const maxDuration = 300;

const DAY = 86_400_000;

function authorized(header: string | null, secret: string) {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily (Vercel cron). Emails first, then the sweep, so a slow transcript fetch never starves the mail:
 *  - day-3 nudge for trial workspaces that have not made a call
 *  - trial-ended notice for workspaces whose 14 days ran out in the last two weeks
 *  - repair of sessions stuck between states
 * All idempotent (email_log, finalize claim).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();
  const results = { nudged: 0, ended: 0, swept: { failed: 0, finalized: 0 } };

  const { data: trials } = await db.from("organizations").select("id, created_at, trial_ends_at").eq("plan", "trial").gt("trial_ends_at", new Date(now - 14 * DAY).toISOString()).limit(1000);
  for (const org of trials ?? []) {
    const ageDays = (now - new Date(org.created_at).getTime()) / DAY;
    if (ageDays >= 3 && ageDays < 10) {
      const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("org_id", org.id);
      if ((count ?? 0) === 0) {
        const r = await sendLifecycle(org.id, "nudge_day3").catch(() => ({ sent: false }));
        if (r.sent) results.nudged += 1;
      }
    }
    if (new Date(org.trial_ends_at).getTime() <= now) {
      const r = await sendLifecycle(org.id, "trial_ended").catch(() => ({ sent: false }));
      if (r.sent) results.ended += 1;
    }
  }

  const swept = await sweepStaleSessions(db, { limit: 10 });
  results.swept = { failed: swept.failed, finalized: swept.finalized };
  return NextResponse.json(results);
}
