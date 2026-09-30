import { NextResponse, after } from "next/server";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";
import { reportError } from "@/lib/sentry";

export const maxDuration = 120;

const STALE_SCORING_MS = 5 * 60_000;

/**
 * Retry for a call whose transcript never arrived, whose review never ran, or whose scoring worker died.
 * Called by the report page while it polls. finalizeCall is idempotent, so a second caller no-ops.
 */
export async function POST(_request: Request, { params }: RouteContext<"/api/calls/[id]/finalize">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const db = createAdminClient();

  const { data: session } = await db.from("call_sessions").select("id, status, user_id, org_id, review_requested_at, scoring_started_at, finalize_attempts").eq("id", id).maybeSingle();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = session.user_id === viewer.userId || (session.org_id === viewer.org.id && canManage(viewer.membership.role));
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.finalize_attempts >= 5) return NextResponse.json({ ok: true, status: session.status, reason: "attempts exhausted" });

  // Staleness is judged from when this scoring claim started, never from the hang-up time: a review requested a day
  // later is not stuck just because the call is old.
  const scoringSince = session.scoring_started_at ? new Date(session.scoring_started_at).getTime() : null;
  const staleScoring = session.status === "scoring" && scoringSince !== null && Date.now() - scoringSince > STALE_SCORING_MS;
  if (staleScoring) await db.from("call_sessions").update({ status: "ended" }).eq("id", id).eq("status", "scoring");

  const stuck = staleScoring || session.status === "ended" || (session.status === "collected" && session.review_requested_at !== null);
  if (!stuck) return NextResponse.json({ ok: true, status: session.status });

  after(async () => {
    try {
      await finalizeCall(id);
    } catch (err) {
      reportError(err, { where: "retry_finalize", sessionId: id });
    }
  });
  return NextResponse.json({ ok: true, status: "scoring" });
}
