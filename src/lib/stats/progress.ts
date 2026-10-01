import { LEVEL_LIST } from "@/lib/domain/levels";
import { LEVEL_UP_MIN_CALLS, LEVEL_UP_THRESHOLD } from "@/lib/scoring/rubric";
import type { Difficulty } from "@/types/database";

export interface SessionLite {
  user_id: string;
  created_at: string;
  difficulty: Difficulty;
  outcome: string | null;
  overall: number | null;
  /** Boss-fight calls count for streaks and call totals, never for scores or the leaderboard. */
  boss?: boolean;
}

const DAY_MS = 86_400_000;

function keyFormatter(tz?: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" });
  }
}

/** Consecutive days (ending today or yesterday, in the viewer's timezone) with at least one call. */
export function streakDays(sessions: SessionLite[], now = new Date(), tz?: string) {
  const fmt = keyFormatter(tz);
  const key = (d: Date) => fmt.format(d);
  const days = new Set(sessions.map((s) => key(new Date(s.created_at))));
  let streak = 0;
  let cursor = now.getTime();
  if (!days.has(key(new Date(cursor)))) cursor -= DAY_MS;
  while (days.has(key(new Date(cursor)))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export function personalBest(sessions: SessionLite[]) {
  return sessions.reduce<number | null>((best, s) => (!s.boss && s.overall != null && (best == null || s.overall > best) ? s.overall : best), null);
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
    const scored = sessions.filter((s) => !s.boss && s.difficulty === level.id && s.overall != null).map((s) => s.overall as number);
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
  /** Reviewed calls behind the average. */
  reviewed: number;
  /** Average of reviewed calls, only once there are enough of them to mean something. */
  avg: number | null;
  booked: number;
  best: number | null;
}

/** Reviews needed before an average is shown or ranked on. Reps choose which calls to review, so a single 8.0 is noise. */
export const MIN_REVIEWED_FOR_AVG = 3;

/**
 * Weekly leaderboard: everyone who made a call this week, ranked by calls made (the thing a rep controls), then by
 * average score where there are enough reviews to trust it.
 */
export function leaderboard(sessions: SessionLite[], names: Map<string, string>, sinceDays = 7, now = new Date()): LeaderRow[] {
  const since = now.getTime() - sinceDays * 86_400_000;
  const byUser = new Map<string, SessionLite[]>();
  for (const s of sessions) {
    if (s.boss || new Date(s.created_at).getTime() < since) continue;
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  }
  return [...byUser.entries()]
    .map(([user_id, list]) => {
      const scores = list.map((s) => s.overall).filter((v): v is number => v != null);
      return {
        user_id,
        name: names.get(user_id) ?? "Rep",
        calls: list.length,
        reviewed: scores.length,
        avg: scores.length >= MIN_REVIEWED_FOR_AVG ? average(scores) : null,
        booked: list.filter((s) => s.outcome === "meeting_booked").length,
        best: personalBest(list),
      };
    })
    .sort((a, b) => b.calls - a.calls || (b.avg ?? -1) - (a.avg ?? -1) || b.booked - a.booked);
}

