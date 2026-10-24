/** The share card for each fixed page, keyed for `/og/page/<key>`. Blog posts and objection pages build theirs from content. */
export interface OgCardSpec {
  title: string;
  kicker?: string;
  footer?: string;
}

export const PAGE_CARDS: Record<string, OgCardSpec> = {
  default: { title: "Karen's on the line. You have three minutes.", kicker: "SDR ramp, on the phone", footer: "10 free calls, work email only" },
  pricing: { title: "Ten free calls. Then decide.", kicker: "Pricing" },
  "for-managers": { title: "Stop ramping reps on your real pipeline.", kicker: "For sales managers" },
  "for-enablement": { title: "Your call library is a training ground.", kicker: "For sales enablement" },
  blog: { title: "Cold calling, with the data attached.", kicker: "Blog" },
  objections: { title: "Every cold-call objection, and what to say back.", kicker: "Objection library", footer: "Fifteen objections, three answers each" },
  karen: { title: "Can you survive Karen?", kicker: "The cold call you will not forget", footer: "Three minutes, no account" },
  leaderboard: { title: "Who lasted longest against Karen this month.", kicker: "Karen leaderboard", footer: "Three minutes, no account" },
  trust: { title: "How we handle your calls and data.", kicker: "Trust and security" },
  legal: { title: "The small print, written to be read.", kicker: "Legal" },
  company: { title: "The company behind 100 Dials.", kicker: "Vilnius, Lithuania", footer: "Hosted in the EU" },
  research: { title: "Built on what the research says about practice.", kicker: "Research", footer: "Nine studies, limits included" },
};

/** The URL of a card, versioned so a changed design busts the CDN and social caches. */
export function ogPath(kind: "page" | "blog" | "objections", slug: string, version: string) {
  return `/og/${kind}/${slug}?v=${encodeURIComponent(version)}`;
}
