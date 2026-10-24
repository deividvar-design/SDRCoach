"use client";

import { useEffect } from "react";

const ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const LABELS: Record<AdsConversionKind, string | undefined> = {
  signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  karen: process.env.NEXT_PUBLIC_GOOGLE_ADS_KAREN_LABEL,
};

export type AdsConversionKind = "signup" | "karen";

/**
 * Sends one Google Ads conversion, once per kind and id per browser. The id doubles as the transaction id, so Google
 * drops a repeat from another screen or browser. The email goes to gtag as user_data for enhanced conversions; Google
 * hashes it before it leaves the page, and consent mode decides whether anything is sent at all. Silent until the id
 * and the label for this kind are in the environment.
 */
export function reportAdsConversion(kind: AdsConversionKind, id: string, opts: { email?: string | null; value?: number; currency?: string } = {}) {
  const label = LABELS[kind];
  if (!ID || !label || typeof window === "undefined") return;
  const key = `adsconv:${kind}:${id}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch {}
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (!w.gtag) return;
  if (opts.email) w.gtag("set", "user_data", { email_address: opts.email });
  const { value, currency = "USD" } = opts;
  w.gtag("event", "conversion", { send_to: `${ID}/${label}`, transaction_id: id, ...(value != null ? { value, currency } : {}) });
  try {
    localStorage.setItem(key, "1");
  } catch {}
}

/** Fires the conversion for the screen it sits on. */
export function AdsConversion({ kind, id, email, value, currency }: { kind: AdsConversionKind; id: string; email?: string | null; value?: number; currency?: string }) {
  useEffect(() => {
    reportAdsConversion(kind, id, { email, value, currency });
  }, [kind, id, email, value, currency]);
  return null;
}
