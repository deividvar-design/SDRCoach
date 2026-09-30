/**
 * Shared Sentry options for the browser, Node and edge runtimes.
 * The DSN is public by design; leaving it unset turns Sentry off entirely, which is the local default.
 */
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
