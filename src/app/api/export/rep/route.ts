import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { RUBRIC, RUBRIC_KEYS } from "@/lib/scoring/rubric";
import { createClient } from "@/lib/supabase/server";
import type { ScoreDimensions } from "@/types/database";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One rep's calls as CSV, for a 1:1 or a QBR. The rep themself or a manager. */
export async function GET(request: Request) {
  const viewer = await requireViewer();
  const userId = new URL(request.url).searchParams.get("user") ?? viewer.userId;
  if (userId !== viewer.userId && !canManage(viewer.membership.role) && !viewer.org.reps_see_team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("call_sessions")
      .select("id, created_at, difficulty, duration_seconds, outcome, status, targets(name, company), call_scores(overall, dimensions)")
      .eq("org_id", viewer.org.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const header = ["date", "target", "company", "level", "duration_seconds", "outcome", "status", "overall", ...RUBRIC_KEYS.map((k) => RUBRIC[k].label.toLowerCase().replace(/\s+/g, "_"))];
  const lines = [header.join(",")];
  for (const s of rows ?? []) {
    const score = Array.isArray(s.call_scores) ? s.call_scores[0] : s.call_scores;
    const dims = (score?.dimensions ?? null) as ScoreDimensions | null;
    lines.push(
      [
        s.created_at,
        s.targets?.name ?? "",
        s.targets?.company ?? "",
        `L${LEVELS[s.difficulty].level} ${LEVELS[s.difficulty].name}`,
        s.duration_seconds ?? "",
        s.outcome ?? "",
        s.status,
        score?.overall ?? "",
        ...RUBRIC_KEYS.map((k) => dims?.[k]?.score ?? ""),
      ]
        .map(cell)
        .join(","),
    );
  }

  const name = (profile?.full_name ?? "rep").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sdrcoach-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
