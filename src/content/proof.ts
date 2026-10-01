/**
 * The proof strip on the marketing site. Every figure here is a product fact the code backs, never a result claimed
 * on a customer's behalf. Add quotes only from named customers who agreed in writing: invented testimonials or
 * numbers are unlawful in the EU (UCPD) and the US (FTC endorsement rules) and the fastest way to lose a B2B buyer.
 */
export const PROOF = {
  stats: [
    { value: "6", label: "skills scored on every reviewed call", detail: "Opener, reason for call, discovery, objection handling, value and close, each with a rationale and a coach summary." },
    { value: "16", label: "objection types tagged with how the rep handled them", detail: "So 'send me an email' has a number per rep, not a feeling, and the coaching view shows which ones the team loses." },
    { value: "3 + 3", label: "difficulty levels and boss fights", detail: "From a warm-up to a cold, resistant buyer, then Karen, Jax and Victor. All built from your own targets and company context." },
  ],
  quotes: [] as { quote: string; name: string; company: string }[],
} as const;
