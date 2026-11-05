import * as Sentry from "@sentry/nextjs";
import { IGNORED_NOISE, sentryBaseOptions } from "@/lib/sentry";

Sentry.init({
  ...sentryBaseOptions,
  // No session replay: it would record the rep's screen, and the practice screen shows their transcript.
  integrations: [],
  // Google's One Tap script throws minified errors of its own ("pa") on browsers it does not support; the sign-in
  // buttons still work there, and nothing in our code is involved, so those frames are not reported. Likewise the
  // Ads tag when a blocker refuses its beacons, and the anti-tracking extensions that wrap fetch to do the refusing.
  denyUrls: [/accounts\.google\.com\/gsi/, /\/gsi\/client/, /\/gtag\/js/, /googletagmanager\.com/, /frame_ant/],
  ignoreErrors: [
    ...IGNORED_NOISE,
    // Browser extensions and abandoned navigations, not us.
    /ResizeObserver loop/,
    /Load failed/,
    /NetworkError when attempting to fetch resource/,
    /A network error occurred/,
    /AbortError/,
    // An ad or tracking blocker refusing a Google beacon; the page is unaffected.
    /Failed to fetch \([a-z0-9.-]*(?:doubleclick|google)[a-z0-9.-]*\)/,
    // The ElevenLabs SDK raises this when the rep denies the mic; the UI already explains it.
    /NotAllowedError/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
