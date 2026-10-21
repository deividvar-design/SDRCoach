import "server-only";
import { cookies } from "next/headers";

export const AD_CLICK_COOKIE = "adclick";

export interface AdClick {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
}

const EMPTY: AdClick = { gclid: null, gbraid: null, wbraid: null };

/** The Google Ads click ids the browser arrived with, captured client-side into a first-party cookie for 90 days. */
export async function readAdClick(): Promise<AdClick> {
  try {
    const raw = (await cookies()).get(AD_CLICK_COOKIE)?.value;
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Record<keyof AdClick, unknown>>;
    const pick = (v: unknown) => (typeof v === "string" && /^[\w-]{1,200}$/.test(v) ? v : null);
    return { gclid: pick(parsed.gclid), gbraid: pick(parsed.gbraid), wbraid: pick(parsed.wbraid) };
  } catch {
    return EMPTY;
  }
}
