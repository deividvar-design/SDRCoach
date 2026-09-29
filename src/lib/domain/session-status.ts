import type { SessionStatus } from "@/types/database";

/** Human labels for a call that has no outcome yet (or never will). */
export const SESSION_STATUS: Record<SessionStatus, { label: string; tone: "muted" | "live" | "warn" }> = {
  created: { label: "Not connected", tone: "muted" },
  live: { label: "In progress", tone: "live" },
  ended: { label: "Processing", tone: "live" },
  scoring: { label: "Reviewing", tone: "live" },
  collected: { label: "Not reviewed", tone: "muted" },
  scored: { label: "Reviewed", tone: "muted" },
  failed: { label: "Failed", tone: "warn" },
};

export const OUTCOME_TEXT: Record<string, string> = {
  meeting_booked: "Meeting booked",
  callback: "Call back later",
  info_sent: "Asked for info",
  rejected: "Rejected",
  hung_up: "Hung up",
  incomplete: "Incomplete",
};
