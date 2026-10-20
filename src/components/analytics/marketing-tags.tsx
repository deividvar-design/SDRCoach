"use client";

import { useEffect } from "react";
import { CONSENT_EVENT, readConsent, type Consent } from "./consent";

/**
 * Ad pixels and visitor identification, loaded once and only after marketing consent. Each tag is off until its id
 * is in the environment, so a preview never fires a production pixel. Withdrawing consent takes effect on the next
 * page load; the scripts cannot be unloaded once they have run.
 */
const IDS = {
  apollo: process.env.NEXT_PUBLIC_APOLLO_APP_ID,
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID,
};
/** The Google Ads tag is already on the page in consent mode (see google-tag.tsx); consent only has to be granted. */
const GOOGLE_ADS = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

let loaded = false;

function script(src: string, onload?: () => void) {
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  el.defer = true;
  if (onload) el.onload = onload;
  document.head.appendChild(el);
}

function grantGoogleConsent() {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" });
}

function loadTags() {
  if (loaded) return;
  loaded = true;
  const w = window as unknown as Record<string, unknown>;

  if (IDS.apollo) {
    const nocache = Math.random().toString(36).slice(7);
    script(`https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=${nocache}`, () => {
      (w.trackingFunctions as { onLoad?: (o: { appId: string }) => void } | undefined)?.onLoad?.({ appId: IDS.apollo! });
    });
  }

  if (IDS.meta) {
    type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][]; loaded: boolean; version: string; callMethod?: (...args: unknown[]) => void; push?: unknown };
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    w.fbq ??= fbq;
    w._fbq ??= fbq;
    script("https://connect.facebook.net/en_US/fbevents.js");
    (w.fbq as Fbq)("init", IDS.meta);
    (w.fbq as Fbq)("track", "PageView");
  }

  if (IDS.linkedin) {
    w._linkedin_partner_id = IDS.linkedin;
    const ids = (w._linkedin_data_partner_ids as string[] | undefined) ?? [];
    ids.push(IDS.linkedin);
    w._linkedin_data_partner_ids = ids;
    script("https://snap.licdn.com/li.lms-analytics/insight.min.js");
  }

}

export function MarketingTags() {
  useEffect(() => {
    if (!Object.values(IDS).some(Boolean) && !GOOGLE_ADS) return;
    const apply = (c: Consent | null) => {
      if (!c?.marketing) return;
      loadTags();
      if (GOOGLE_ADS) grantGoogleConsent();
    };
    apply(readConsent());
    const onChange = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);
  return null;
}
