import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { sweepStaleSessions } from "@/lib/calls/sweep";

export const maxDuration = 300;

/**
 * Daily (Vercel cron). Two jobs:
 *  - day-3 nudge for trial workspaces that have not made a call
 *  - trial-ended notice for workspaces whose 14 days ran out
 * Both are idempotent through email_log.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();
  const results = { nudged: 0, ended: 0, swept: await sweepStaleSessions(db) };

  const { data: trials } = await db.from("organizations").select("id, created_at, trial_ends_at").eq("plan", "trial");
  for (const org of trials ?? []) {
    const ageDays = (now - new Date(org.created_at).getTime()) / 86_400_000;
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

  return NextResponse.json(results);
}
