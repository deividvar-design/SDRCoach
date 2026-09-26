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
  quotes: [
    {
      quote: "My new reps used to burn their first fifty real dials learning the opener. Now they burn fifty fake ones on Sunday night and book on Monday.",
      name: "Head of Sales Development",
      company: "Series B logistics software, 12 SDRs",
    },
    {
      quote: "The Level 3 prospect hangs up on you. Reps hated it for a week and then their real connect rate went up. I can see every call without listening to every call.",
      name: "Sales Enablement Lead",
      company: "Fintech, 40-person outbound team",
    },
    {
      quote: "We uploaded a quarter of Gong transcripts and the prospects started saying the exact objections our market says. That was the moment the team took it seriously.",
      name: "SDR Manager",
      company: "Fleet telematics, 8 SDRs",
    },
  ],
} as const;
