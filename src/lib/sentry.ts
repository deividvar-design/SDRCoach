/**
 * Shared Sentry options for the browser, Node and edge runtimes.
 * The DSN is public by design; leaving it unset turns Sentry off entirely, which is the local default.
 */
import * as Sentry from "@sentry/nextjs";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only. Tracing costs quota and the app's latency lives in ElevenLabs and Anthropic, not here.
  tracesSampleRate: 0,
  // Never attach cookies, IPs or request bodies: transcripts and emails must not leave the EU stack.
  sendDefaultPii: false,
};

/** Tags an error with the call it belongs to so a failed review can be traced from the Sentry issue. */
export function callContext(sessionId: string, extra: Record<string, unknown> = {}) {
  return { tags: { session_id: sessionId }, extra };
}

/**
 * The one way to report a swallowed failure: logs it and sends it to Sentry with whatever ids we have.
 * Use in every catch that does not rethrow, so nothing on the call path fails silently.
 */
export function reportError(err: unknown, ctx: { where: string; sessionId?: string | null; orgId?: string | null; extra?: Record<string, unknown> }) {
  console.error(`[${ctx.where}]`, ctx.sessionId ?? ctx.orgId ?? "", err);
  const tags: Record<string, string> = {};
  if (ctx.sessionId) tags.session_id = ctx.sessionId;
  if (ctx.orgId) tags.org_id = ctx.orgId;
  Sentry.captureException(err, { tags, extra: { where: ctx.where, ...ctx.extra } });
}
