"use client";

export interface Consent {
  analytics: boolean;
  /** Ad pixels and visitor identification. Separate from analytics so "only necessary" stays honest. */
  marketing: boolean;
  at: string;
  /** True when nothing was chosen and the visitor's region does not require consent first. */
  implied?: boolean;
}

/** The middleware stamps "eea" or "row" from the visitor's country. Missing means consent is required. */
export function consentRequired() {
  try {
    return !/(?:^|; )cr=row(?:;|$)/.test(document.cookie);
  } catch {
    return true;
  }
}

/** The stored choice, else the region's default: nothing in the EEA, UK and Switzerland, everything elsewhere. */
export function effectiveConsent(): Consent | null {
  const stored = readConsent();
  if (stored) return stored;
  return consentRequired() ? null : { analytics: true, marketing: true, at: "", implied: true };
}

const KEY = "cookie-consent";
export const CONSENT_EVENT = "100dials:consent";
export const OPEN_EVENT = "100dials:consent-open";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (!parsed.at) return null;
    // Re-ask after 12 months, and re-ask anyone who answered before marketing tags existed.
    if (Date.now() - new Date(parsed.at).getTime() > 365 * 86_400_000) return null;
    if (typeof parsed.marketing !== "boolean") return null;
    return { analytics: Boolean(parsed.analytics), marketing: parsed.marketing, at: parsed.at };
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean, marketing = analytics) {
  const value: Consent = { analytics, marketing, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function openConsent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
