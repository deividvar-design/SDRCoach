import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The viewer's calls that are still being reviewed, plus the ones reviewed in the last quarter hour.
 * The review watcher in the app shell polls this while anything is pending.
 */
export async function GET() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();

  const { data: rows } = await supabase
    .from("call_sessions")
    .select("id, status, ended_at, targets(name, company)")
    .eq("user_id", viewer.userId)
    .not("review_requested_at", "is", null)
    .in("status", ["ended", "scoring", "scored"])
    .gt("ended_at", since)
    .order("ended_at", { ascending: false })
    .limit(10);

  const sessions = rows ?? [];
  const scoredIds = sessions.filter((s) => s.status === "scored").map((s) => s.id);
  const { data: scores } = scoredIds.length ? await supabase.from("call_scores").select("session_id, overall").in("session_id", scoredIds) : { data: [] };
  const overallBy = new Map((scores ?? []).map((s) => [s.session_id, s.overall]));

  return NextResponse.json({
    pending: sessions.filter((s) => s.status !== "scored").map((s) => s.id),
    scored: sessions
      .filter((s) => s.status === "scored")
      .map((s) => ({
        id: s.id,
        overall: overallBy.get(s.id) ?? null,
        prospect: s.targets ? `${s.targets.name}, ${s.targets.company}` : "your call",
      })),
  });
}
