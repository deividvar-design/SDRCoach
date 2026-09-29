import { NextResponse, after } from "next/server";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";

export const maxDuration = 120;

/**
 * Retry scoring for a call that ended but is still waiting on its transcript.
 * Called by the report page while it polls. finalizeCall is idempotent, so a second caller no-ops.
 */
export async function POST(_request: Request, { params }: RouteContext<"/api/calls/[id]/finalize">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const db = createAdminClient();

  const { data: session } = await db.from("call_sessions").select("id, status, user_id, org_id, review_requested_at").eq("id", id).maybeSingle();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user_id !== viewer.userId && session.org_id !== viewer.org.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Retry when the transcript never arrived, or when a review was requested but the score never ran.
  const stuck = session.status === "ended" || (session.status === "collected" && session.review_requested_at !== null);
  if (!stuck) return NextResponse.json({ ok: true, status: session.status });

  after(async () => {
    try {
      await finalizeCall(id);
    } catch (err) {
      console.error("retry finalize failed", id, err);
    }
  });
  return NextResponse.json({ ok: true, status: "scoring" });
}
