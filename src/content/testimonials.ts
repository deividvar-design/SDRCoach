/**
 * Customer quotes shown on the public site, word for word as the customer approved them. One object feeds both the
 * full card and the slim strip under the hero, so the wording can never drift between the two.
 */
export interface Testimonial {
  /** The lead line, set large. */
  quote: string;
  /** The longer passage under it. */
  body: string;
  /** The one line used in tight spaces, taken from the quote. */
  pull: string;
  name: string;
  title: string;
  company: string;
  /** Short form for tight spaces, e.g. "CEO". */
  shortTitle: string;
  initials: string;
  /** Path under /public. Monochrome, so it sits quietly next to the quote. */
  logo: string;
  /** Path under /public, or null for the initials circle. */
  avatar: string | null;
  url: string;
}

export const SALESFORGE: Testimonial = {
  quote: "Every SDR's first 100 calls are bad. The question is who pays for them. With 100 Dials it's an AI prospect instead of your ICP.",
  pull: "Every SDR's first 100 calls are bad. The question is who pays for them.",
  body: "What I like: the prospects are built from your own target accounts, and the scoring is specific. It quotes what the rep said and gives one thing to fix, not a vague 6/10. Managers see the weakest skill and the most-lost objection across the whole team.",
  name: "Frank Sondors",
  title: "Founder & CEO, Salesforge",
  company: "Salesforge",
  shortTitle: "CEO",
  initials: "FS",
  logo: "/logos/salesforge.svg",
  avatar: "/testimonials/frank-sondors.webp",
  url: "https://www.salesforge.ai",
};

/** The one-line pull quote under the hero. Flip to false to remove it without touching the hero. */
export const SHOW_TESTIMONIAL_STRIP = true;
