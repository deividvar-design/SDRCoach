/**
 * What every Karen caller sells. One shared, made-up product, so the rep has something real to pitch, Karen reacts
 * to the same facts, and the scorer grades value and discovery against them. It fits Karen's hidden pains without
 * naming them: the rep still has to find them.
 */
export const KAREN_BRIEF = {
  company: "Clausefield",
  oneLine: "Software that tracks every supplier contract and service level in one place.",
  points: [
    "Warns you 90 days before each contract renews and shows how well that supplier did.",
    "Shows which suppliers miss their targets, with proof, before anyone argues about whose fault it is.",
    "Built for procurement teams managing 100+ suppliers.",
  ],
  proof: "A property group your size caught two contracts that were about to renew without review, and got better terms on both.",
  ask: "Book a 15-minute meeting for later this week.",
} as const;

/** The same brief as one paragraph, for the prospect's and the scorer's prompts. */
export const KAREN_BRIEF_TEXT = `${KAREN_BRIEF.company}: ${KAREN_BRIEF.oneLine} ${KAREN_BRIEF.points.join(" ")} Example customer: ${KAREN_BRIEF.proof}`;
