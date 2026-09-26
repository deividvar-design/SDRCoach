/** Single source of truth for site-wide identity. Legal details are placeholders until incorporated. */
export const SITE = {
  name: "SDRCoach",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://sdrcoach.io").replace(/\/$/, ""),
  tagline: "Practice the call before it counts.",
  description: "AI cold-call training for SDR teams. Reps dial realistic AI prospects built from their own targets and get coached on every call.",
  company: {
    legalName: "SDRCoach, UAB",
    address: "Vilnius, Lithuania",
    country: "Lithuania",
    email: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "hello@sdrcoach.io",
    privacyEmail: "privacy@sdrcoach.io",
    securityEmail: "security@sdrcoach.io",
  },
  social: {
    linkedin: "https://www.linkedin.com/company/sdrcoach",
    x: "https://x.com/sdrcoach",
  },
  legalUpdated: "2026-09-26",
} as const;

export function absoluteUrl(path = "/") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
