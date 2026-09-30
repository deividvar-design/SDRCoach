import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Full workspace export as JSON. Managers only; RLS scopes every query to the workspace. */
export async function GET() {
  const viewer = await requireManager();
  const supabase = await createClient();
  const org = viewer.org.id;

  const [members, targets, assignments, sessions, transcripts, scores, knowledge] = await Promise.all([
    supabase.from("memberships").select("user_id, role, created_at, profiles!memberships_user_id_fkey(full_name)").eq("org_id", org),
    supabase.from("targets").select("*").eq("org_id", org),
    supabase.from("assignments").select("*").eq("org_id", org),
    supabase.from("call_sessions").select("*").eq("org_id", org),
    supabase.from("call_transcripts").select("*, call_sessions!inner(org_id)").eq("call_sessions.org_id", org),
    supabase.from("call_scores").select("*, call_sessions!inner(org_id)").eq("call_sessions.org_id", org),
    supabase.from("knowledge_sources").select("id, name, kind, status, summary, created_at").eq("org_id", org),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    organization: viewer.org,
    members: members.data ?? [],
    targets: targets.data ?? [],
    assignments: assignments.data ?? [],
    calls: (sessions.data ?? []).map((s) => ({
      ...s,
      transcript: (transcripts.data ?? []).find((t) => t.session_id === s.id) ?? null,
      score: (scores.data ?? []).find((t) => t.session_id === s.id) ?? null,
    })),
    knowledge_sources: knowledge.data ?? [],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="100dials-${viewer.org.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
