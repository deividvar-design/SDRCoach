"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { CONSENT_EVENT, readConsent, type Consent } from "./consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";


let started = false;

function startAnalytics() {
  if (started) return;
  started = true;
  if (KEY) {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
    });
  }
}

function stopAnalytics() {
  if (!started) return;
  started = false;
  if (KEY) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
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
    if (KEY) posthog.capture("$pageview", { $current_url: url });
  }, [pathname, search]);

  return null;
}

/** Product event. No-op until the visitor consents. */
export function track(event: string, props?: Record<string, unknown>) {
  if (!started) return;
  if (KEY) posthog.capture(event, props);
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!started || !KEY) return;
  posthog.identify(userId, props);
}
