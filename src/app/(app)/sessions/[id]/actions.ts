"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";
import { createClient } from "@/lib/supabase/server";
import { elevenlabs } from "@/lib/elevenlabs/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { reportError } from "@/lib/sentry";

/** The rep who made the call, or a manager in the same workspace. */
async function ownSession(sessionId: string) {
  const viewer = await requireViewer();
  const db = createAdminClient();
  const { data } = await db.from("call_sessions").select("id, status, user_id, org_id, finalize_attempts").eq("id", sessionId).maybeSingle();
  const allowed = data && (data.user_id === viewer.userId || (data.org_id === viewer.org.id && canManage(viewer.membership.role)));
  return { db, session: allowed ? data : null };
}

/** The rep wants the coach's review. Scores now if the transcript is in; otherwise scoring follows collection. */
export async function requestReview(sessionId: string) {
  const { db, session } = await ownSession(sessionId);
  if (!session) return;
  // The scorer gets five tries per call in total; after that the report shows what was collected and stops asking.
  if (session.finalize_attempts >= 5) return;
  await db.from("call_sessions").update({ review_requested_at: new Date().toISOString(), review_skipped_at: null }).eq("id", sessionId);
  if (session.status === "collected" || session.status === "ended" || session.status === "failed") {
    after(async () => {
      try {
        await finalizeCall(sessionId);
      } catch (err) {
        reportError(err, { where: "requested_review", sessionId });
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

export interface CommentState {
  error?: string;
  ok?: boolean;
}

/** Anyone who can read the call can comment on it; the rep sees it on their dashboard. */
export async function addComment(sessionId: string, _prev: CommentState, formData: FormData): Promise<CommentState> {
  const body = z.string().trim().min(1, "Write something first").max(2000, "Keep it under 2,000 characters").safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0]?.message };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("call_comments").insert({ session_id: sessionId, org_id: viewer.org.id, author_id: viewer.userId, body: body.data });
  if (error) return { error: error.message };
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteComment(id: string, sessionId: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("call_comments").delete().eq("id", id);
  revalidatePath(`/sessions/${sessionId}`);
}

/** Removes the call everywhere: our rows (cascade) and the recording and transcript at the voice provider. */
export async function deleteCall(sessionId: string) {
  const viewer = await requireViewer();
  // Managers only: a rep deleting their own calls would erase bad ones from the board and the coaching data.
  if (!canManage(viewer.membership.role)) return { error: "Only managers can delete calls." };
  const { db, session } = await ownSession(sessionId);
  if (!session) return { error: "Not found" };
  const { data: full } = await db.from("call_sessions").select("elevenlabs_conversation_id").eq("id", sessionId).maybeSingle();
  if (full?.elevenlabs_conversation_id && process.env.ELEVENLABS_API_KEY) {
    try {
      await elevenlabs().conversationalAi.conversations.delete(full.elevenlabs_conversation_id);
    } catch (err) {
      reportError(err, { where: "provider_delete", sessionId });
    }
  }
  await db.from("call_sessions").delete().eq("id", sessionId);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  redirect("/sessions");
}
