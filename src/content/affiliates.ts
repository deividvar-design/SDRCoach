/** The affiliate programme's terms in one place: the page, the emails, the statement maths and the admin all read these. */
export const AFFILIATE = {
  /** Share of net payments (after VAT, refunds and chargebacks). */
  sharePercent: 25,
  /** Months from a referred team's first payment during which its payments earn commission. */
  earningMonths: 12,
  /** A payment earns commission only once the money-back window has passed. */
  guaranteeDays: 30,
  /** Balances below this carry over to the next quarter; same figure in dollars and euros. */
  minimumPayout: 100,
  /** Days the referral cookie lasts after the first click. */
  cookieDays: 90,
  /** Statements go out on the first Monday of each quarter and are paid within this many days. */
  payoutWithinDays: 14,
} as const;

export const AFFILIATE_RULES = [
  "No paid search or social ads on the 100 Dials name or brand terms.",
  "No coupon, deal or cashback sites, and no spam of any kind.",
  "No referring yourself, your own company, or a team that is already a customer.",
  "Say that you may earn a commission wherever the law where you publish requires it.",
  "Breaking a rule closes the account and forfeits any unpaid balance.",
];
