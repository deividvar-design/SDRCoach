import { LEVELS, LEVEL_LIST } from "@/lib/domain/levels";
import { LEVEL_UP_MIN_CALLS, LEVEL_UP_THRESHOLD } from "@/lib/scoring/rubric";
import type { Difficulty } from "@/types/database";

export interface SessionLite {
  user_id: string;
  created_at: string;
  difficulty: Difficulty;
  outcome: string | null;
  overall: number | null;
}

function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** Consecutive days (ending today or yesterday) with at least one call. */
export function streakDays(sessions: SessionLite[], now = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.created_at))));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function personalBest(sessions: SessionLite[]) {
  return sessions.reduce<number | null>((best, s) => (s.overall != null && (best == null || s.overall > best) ? s.overall : best), null);
}

export function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * Where a rep stands per level and whether they've earned a nudge to the next one.
 * Recommendation only: nothing is locked.
 */
export function levelProgress(sessions: SessionLite[]) {
  return LEVEL_LIST.map((level, i) => {
    const scored = sessions.filter((s) => s.difficulty === level.id && s.overall != null).map((s) => s.overall as number);
    const recent = scored.slice(0, LEVEL_UP_MIN_CALLS);
    const avg = average(recent);
    const next = LEVEL_LIST[i + 1];
    const ready = Boolean(next) && recent.length >= LEVEL_UP_MIN_CALLS && (avg ?? 0) >= LEVEL_UP_THRESHOLD;
    return { level, calls: scored.length, recentAvg: avg, ready, next };
  });
}

export function suggestedLevel(sessions: SessionLite[]): Difficulty {
  const progress = levelProgress(sessions);
  let suggestion: Difficulty = "warm";
  for (const p of progress) {
    if (p.ready && p.next) suggestion = p.next.id;
    else break;
  }
  return suggestion;
}

export interface LeaderRow {
  user_id: string;
  name: string;
  calls: number;
  avg: number | null;
  booked: number;
  best: number | null;
}

/** Weekly leaderboard: ranked by average score with a minimum of one scored call. */
export function leaderboard(sessions: SessionLite[], names: Map<string, string>, sinceDays = 7, now = new Date()): LeaderRow[] {
  const since = now.getTime() - sinceDays * 86_400_000;
  const byUser = new Map<string, SessionLite[]>();
  for (const s of sessions) {
    if (new Date(s.created_at).getTime() < since) continue;
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  }
  return [...byUser.entries()]
    .map(([user_id, list]) => {
      const scores = list.map((s) => s.overall).filter((v): v is number => v != null);
      return {
        user_id,
        name: names.get(user_id) ?? "Rep",
        calls: list.length,
        avg: average(scores),
        booked: list.filter((s) => s.outcome === "meeting_booked").length,
        best: personalBest(list),
      };
    })
    .filter((r) => r.avg != null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0) || b.calls - a.calls);
}

export { LEVELS };
