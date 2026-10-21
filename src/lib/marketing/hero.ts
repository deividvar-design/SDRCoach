/**
 * Homepage headline. The cookie-based split test is over: the page now renders one variant for everyone so it can be
 * cached, and HERO_VARIANT in the environment switches the copy without a deploy. The variant is still recorded on
 * signup so the admin signups table keeps saying which headline each account saw.
 */
export type HeroVariant = "ramp" | "karen";
export const DEFAULT_HERO: HeroVariant = "karen";

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

/** The environment's pick, else the default. No request state, so pages that use it can be static. */
export function heroVariant(): HeroVariant {
  const v = process.env.HERO_VARIANT;
  return isHeroVariant(v) ? v : DEFAULT_HERO;
}
