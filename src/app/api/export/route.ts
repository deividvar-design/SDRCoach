import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/paginate";

/** Full workspace export as JSON. Managers only; RLS scopes every query to the workspace. */
export async function GET() {
  const viewer = await requireManager();
  const supabase = await createClient();
  const org = viewer.org.id;

  const [members, targets, sessions, transcripts, scores, knowledge] = await Promise.all([
    fetchAll((a, b) => supabase.from("memberships").select("user_id, role, created_at, profiles!memberships_user_id_fkey(full_name)").eq("org_id", org).order("created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("targets").select("*").eq("org_id", org).order("created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("call_sessions").select("*").eq("org_id", org).order("created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("call_transcripts").select("*, call_sessions!inner(org_id)").eq("call_sessions.org_id", org).order("session_id").range(a, b)),
    fetchAll((a, b) => supabase.from("call_scores").select("*, call_sessions!inner(org_id)").eq("call_sessions.org_id", org).order("session_id").range(a, b)),
    fetchAll((a, b) => supabase.from("knowledge_sources").select("id, name, kind, status, summary, created_at").eq("org_id", org).order("created_at").range(a, b)),
  ]);

  const transcriptBy = new Map(transcripts.map((t) => [t.session_id, t]));
  const scoreBy = new Map(scores.map((t) => [t.session_id, t]));
  const body = {
    exported_at: new Date().toISOString(),
    organization: viewer.org,
    members,
    targets,
    calls: sessions.map((s) => ({ ...s, transcript: transcriptBy.get(s.id) ?? null, score: scoreBy.get(s.id) ?? null })),
    knowledge_sources: knowledge,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="100dials-${viewer.org.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
