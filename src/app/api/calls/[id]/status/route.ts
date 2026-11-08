import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * A small fingerprint of where a call's report stands: its status, whether the transcript and the score have
 * arrived, and whether a review was asked for. The report page polls this while the coach works and only re-renders
 * when it changes. RLS decides visibility; a call you cannot see reads as missing.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("call_sessions")
    .select("status, review_requested_at, call_transcripts(session_id), call_scores(session_id)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ state: null }, { status: 404 });
  const state = [data.status, data.review_requested_at ? "review" : "", data.call_transcripts ? "transcript" : "", data.call_scores ? "score" : ""].join(":");
  return NextResponse.json({ state }, { headers: { "Cache-Control": "no-store" } });
}
