import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { KAREN } from "./boss";
export { COUNTER_MIN } from "./share-constants";

/** Short, unguessable, and never the row id, which doubles as the demo's session secret. */
export function newShareSlug() {
  return randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, 10).toLowerCase();
}

export const SHARE_FIELDS = "share_slug, display_name, display_company, leaderboard_opt_in, duration_seconds, overall, outcome, outcome_reason, score, created_at" as const;

/** The public view of a scored call. Nothing from the row that the rep did not choose to show. */
export async function publicScorecard(slug: string) {
  if (!/^[a-z0-9]{6,12}$/.test(slug)) return null;
  const { data } = await createAdminClient().from("demo_calls").select(SHARE_FIELDS).eq("share_slug", slug).eq("status", "scored").maybeSingle();
  return data ?? null;
}

/** The first sentence of the coach's summary: the one line that travels with a share. */
export function coachLine(summary: string | null | undefined) {
  const first = (summary ?? "").split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
}

export function survivedLabel(seconds: number | null | undefined) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Karen calls this month that ended without a meeting or a callback: public demos plus in-app boss fights against her. */
export async function karenHangUpsThisMonth() {
  const db = createAdminClient();
  const since = monthStart();
  const [demo, app] = await Promise.all([
    db.from("demo_calls").select("id", { count: "exact", head: true }).eq("status", "scored").gte("created_at", since).not("outcome", "in", "(meeting_booked,callback)"),
    db.from("call_sessions").select("id, targets!inner(name)", { count: "exact", head: true }).eq("status", "scored").eq("boss", true).eq("targets.name", KAREN.name).gte("created_at", since).not("outcome", "in", "(meeting_booked,callback)"),
  ]);
  return (demo.count ?? 0) + (app.count ?? 0);
}


export async function leaderboard(limit = 20) {
  const { data } = await createAdminClient()
    .from("demo_calls")
    .select("share_slug, display_name, display_company, duration_seconds, overall, outcome")
    .eq("status", "scored")
    .eq("leaderboard_opt_in", true)
    .gte("created_at", monthStart())
    .not("duration_seconds", "is", null)
    .order("duration_seconds", { ascending: false })
    .order("overall", { ascending: false })
    .limit(limit);
  return data ?? [];
}
