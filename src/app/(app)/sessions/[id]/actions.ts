"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";

/** The rep who made the call, or a manager in the same workspace. */
async function ownSession(sessionId: string) {
  const viewer = await requireViewer();
  const db = createAdminClient();
  const { data } = await db.from("call_sessions").select("id, status, user_id, org_id").eq("id", sessionId).maybeSingle();
  const allowed = data && (data.user_id === viewer.userId || (data.org_id === viewer.org.id && canManage(viewer.membership.role)));
  return { db, session: allowed ? data : null };
}

/** The rep wants the coach's review. Scores now if the transcript is in; otherwise scoring follows collection. */
export async function requestReview(sessionId: string) {
  const { db, session } = await ownSession(sessionId);
  if (!session) return;
  await db.from("call_sessions").update({ review_requested_at: new Date().toISOString(), review_skipped_at: null }).eq("id", sessionId);
  if (session.status === "collected" || session.status === "ended" || session.status === "failed") {
    after(async () => {
      try {
        await finalizeCall(sessionId);
      } catch (err) {
        console.error("requested review failed", sessionId, err);
      }
    });
  }
  revalidatePath(`/sessions/${sessionId}`);
}

/** The rep already knows how that one went. Keep the transcript and outcome, skip the score. */
export async function skipReview(sessionId: string) {
  const { db, session } = await ownSession(sessionId);
  if (!session) return;
  await db.from("call_sessions").update({ review_skipped_at: new Date().toISOString() }).eq("id", sessionId);
  revalidatePath(`/sessions/${sessionId}`);
}
