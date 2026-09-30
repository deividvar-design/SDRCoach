"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CONSENT_EVENT, readConsent, type Consent } from "./consent";

type PostHog = typeof import("posthog-js").default;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// The analytics library is only downloaded after consent, so visitors who decline never pay for it.
let ph: PostHog | null = null;
let started = false;
let loading: Promise<void> | null = null;

function startAnalytics() {
  if (started || !KEY) return;
  started = true;
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
    });
    ph = posthog;
  });
}

function stopAnalytics() {
  if (!started) return;
  started = false;
  ph?.opt_out_capturing();
  ph?.reset();
  // Drop analytics cookies so a rejected choice takes effect on this load.
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0]?.trim() ?? "";
    if (name.startsWith("ph_")) document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
  }
}

/** Fires pageviews on route change, only after consent. */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const search = useSearchParams();
  const consented = useRef(false);

  useEffect(() => {
    const apply = (c: Consent | null) => {
      consented.current = Boolean(c?.analytics);
      if (c?.analytics) startAnalytics();
      else stopAnalytics();
    };
    apply(readConsent());
    const onChange = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!consented.current || !started) return;
    const url = `${location.origin}${pathname}${search.size ? `?${search}` : ""}`;
    loading?.then(() => ph?.capture("$pageview", { $current_url: url }));
  }, [pathname, search]);

  return null;
}

/** Product event. No-op until the visitor consents. */
export function track(event: string, props?: Record<string, unknown>) {
  if (!started) return;
  loading?.then(() => ph?.capture(event, props));
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!started) return;
  loading?.then(() => ph?.identify(userId, props));
}
