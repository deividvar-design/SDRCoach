"use client";

export interface Consent {
  analytics: boolean;
  at: string;
}

const KEY = "cookie-consent";
export const CONSENT_EVENT = "100dials:consent";
export const OPEN_EVENT = "100dials:consent-open";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    // Re-ask after 12 months.
    if (Date.now() - new Date(parsed.at).getTime() > 365 * 86_400_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean) {
  const value: Consent = { analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function openConsent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
