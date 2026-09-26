/**
 * Social proof shown on the marketing site.
 *
 * `placeholder: true` renders everything under an "Illustrative" label. These are written to show the
 * shape of real results, not to be passed off as customer claims: publishing invented testimonials or
 * numbers as genuine is unlawful in the EU (UCPD) and the US (FTC endorsement rules) and it is the
 * fastest way to lose a B2B buyer's trust. Replace with design-partner quotes and flip the flag.
 */
export const PROOF = {
  placeholder: true,
  stats: [
    { value: "2.1×", label: "more meetings booked", detail: "by reps after 20 practice calls, versus their first 20 real dials" },
    { value: "9 days", label: "average ramp to first booked meeting", detail: "for new SDRs, down from about five weeks" },
    { value: "83%", label: "of calls scored within 60 seconds", detail: "with a transcript, six-dimension breakdown and a coach summary" },
  ],
  quotes: [] as { quote: string; name: string; company: string }[],
} as const;
