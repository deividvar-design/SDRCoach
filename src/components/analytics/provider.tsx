"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { CONSENT_EVENT, readConsent, type Consent } from "./consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const GA = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

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
  if (GA && !document.getElementById("ga4")) {
    const s = document.createElement("script");
    s.id = "ga4";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer!.push(args);
    window.gtag("js", new Date());
    window.gtag("config", GA, { anonymize_ip: true, send_page_view: false });
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
    if (/^(ph_|_ga)/.test(name)) document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
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
    if (GA) window.gtag?.("event", "page_view", { page_location: url, page_path: pathname });
  }, [pathname, search]);

  return null;
}

/** Product event. No-op until the visitor consents. */
export function track(event: string, props?: Record<string, unknown>) {
  if (!started) return;
  if (KEY) posthog.capture(event, props);
  if (GA) window.gtag?.("event", event, props);
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!started || !KEY) return;
  posthog.identify(userId, props);
}
