import * as Sentry from "@sentry/nextjs";
import { IGNORED_NOISE, sentryBaseOptions } from "@/lib/sentry";

Sentry.init({
  ...sentryBaseOptions,
  // No session replay: it would record the rep's screen, and the practice screen shows their transcript.
  integrations: [],
  // Google's One Tap script throws minified errors of its own ("pa") on browsers it does not support; the sign-in
  // buttons still work there, and nothing in our code is involved, so those frames are not reported.
  denyUrls: [/accounts\.google\.com\/gsi/, /\/gsi\/client/],
  ignoreErrors: [
    ...IGNORED_NOISE,
    // Browser extensions and abandoned navigations, not us.
    /ResizeObserver loop/,
    /Load failed/,
    /NetworkError when attempting to fetch resource/,
    /A network error occurred/,
    /AbortError/,
    // The ElevenLabs SDK raises this when the rep denies the mic; the UI already explains it.
    /NotAllowedError/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
