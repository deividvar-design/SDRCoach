/**
 * Where the product analytics tool keeps its data, derived from the PostHog host so the cookie, trust and privacy
 * pages never claim a region the configuration does not match.
 */
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
export const ANALYTICS_IN_EU = /\/\/eu\./.test(POSTHOG_HOST);
export const ANALYTICS_REGION = ANALYTICS_IN_EU ? "the EU" : "the United States";
export const ANALYTICS_REGION_SHORT = ANALYTICS_IN_EU ? "European Union" : "United States";
/** The PostHog app for the configured region, where a session link or a person profile opens. */
export const POSTHOG_UI_HOST = ANALYTICS_IN_EU ? "https://eu.posthog.com" : "https://us.posthog.com";
/** The static asset host that pairs with the ingestion host, used by the reverse proxy. */
export const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace(/\/\/(eu|us)\./, "//$1-assets.");
