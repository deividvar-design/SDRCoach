import "server-only";
import { cookies } from "next/headers";
import { POSTHOG_HOST } from "@/lib/analytics-region";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export interface AnalyticsIdentity {
  distinctId: string;
  sessionId: string | null;
}

/**
 * The browser's product-analytics identity, from the cookie posthog-js writes once the visitor has consented. Null
 * when there is no consent or no analytics: nothing is sent from the server for that visitor either, so the server
 * never reports more than the page would.
 */
export async function analyticsIdentity(): Promise<AnalyticsIdentity | null> {
  if (!KEY) return null;
  try {
    const raw = (await cookies()).get(`ph_${KEY}_posthog`)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as { distinct_id?: unknown; $sesid?: unknown };
    if (typeof parsed.distinct_id !== "string" || !parsed.distinct_id) return null;
    const ses = Array.isArray(parsed.$sesid) ? parsed.$sesid[1] : null;
    return { distinctId: parsed.distinct_id, sessionId: typeof ses === "string" ? ses : null };
  } catch {
    return null;
  }
}

/**
 * One product event sent from the server, for milestones that happen after the visitor may have left the page (a
 * report scored a minute after the call). `identified` is true when the distinct id is a signed-in user's id, so a
 * person profile is kept; anonymous ids are left profile-less, matching the client's identified_only setting. Never
 * throws and never blocks the request on the analytics host.
 */
export async function captureServer(distinctId: string, event: string, props: Record<string, unknown> = {}, opts: { sessionId?: string | null; identified?: boolean } = {}) {
  if (!KEY || process.env.SDRCOACH_DEMO === "1") return;
  try {
    await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId,
        timestamp: new Date().toISOString(),
        properties: {
          ...props,
          $lib: "100dials-server",
          $process_person_profile: Boolean(opts.identified),
          ...(opts.sessionId ? { $session_id: opts.sessionId } : {}),
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Analytics never fails a request.
  }
}
