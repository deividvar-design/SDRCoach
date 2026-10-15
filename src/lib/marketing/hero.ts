import { cookies } from "next/headers";

/**
 * Homepage headline test. The variant is assigned once per browser in the proxy (cookie `hero`), read here on the
 * server so the page renders the right copy on first paint, and attached to the signup event so the two can be
 * compared. HERO_VARIANT in the environment pins one variant and ends the test.
 */
export type HeroVariant = "ramp" | "karen";
export const HERO_COOKIE = "hero";
export const HERO_VARIANTS: HeroVariant[] = ["ramp", "karen"];

export const HERO_COPY: Record<HeroVariant, { headline: string[]; sub: string; large: boolean }> = {
  ramp: {
    headline: ["Your new SDR will quit or get fired", "before they survive a hard call."],
    sub: "Karen fixes that in 14 days.",
    large: false,
  },
  karen: {
    headline: ["Karen's on the line.", "You have three minutes."],
    sub: "New reps get their hard calls in here, before they get them on your pipeline.",
    large: true,
  },
};

export function isHeroVariant(v: unknown): v is HeroVariant {
  return v === "ramp" || v === "karen";
}

/** Pinned by the environment, else the browser's assigned variant, else the default. */
export function pinnedHeroVariant(): HeroVariant | null {
  const v = process.env.HERO_VARIANT;
  return isHeroVariant(v) ? v : null;
}

export async function heroVariant(): Promise<HeroVariant> {
  const pinned = pinnedHeroVariant();
  if (pinned) return pinned;
  const v = (await cookies()).get(HERO_COOKIE)?.value;
  return isHeroVariant(v) ? v : "ramp";
}
