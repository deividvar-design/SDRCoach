"use client";

import { useEffect } from "react";

const ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const LABELS: Record<"signup" | "karen", string | undefined> = {
  signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  karen: process.env.NEXT_PUBLIC_GOOGLE_ADS_KAREN_LABEL,
};

/**
 * Fires one Google Ads conversion for the screen it sits on, once per id per browser. The email goes to gtag as
 * user_data for enhanced conversions; Google hashes it before it leaves the page, and consent mode decides whether
 * anything is sent at all. Silent until the id and the label for this kind are in the environment.
 */
export function AdsConversion({ kind, id, email, value, currency = "USD" }: { kind: "signup" | "karen"; id: string; email?: string | null; value?: number; currency?: string }) {
  useEffect(() => {
    const label = LABELS[kind];
    if (!ID || !label) return;
    const key = `adsconv:${kind}:${id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (!w.gtag) return;
    if (email) w.gtag("set", "user_data", { email_address: email });
    w.gtag("event", "conversion", { send_to: `${ID}/${label}`, transaction_id: id, ...(value != null ? { value, currency } : {}) });
    try {
      localStorage.setItem(key, "1");
    } catch {}
  }, [kind, id, email, value, currency]);
  return null;
}
