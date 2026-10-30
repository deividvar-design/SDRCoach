import { SITE } from "@/lib/site";

export const REFERRAL_COOKIE = "ref";

/** The link a workspace shares. Lands on the homepage with the code kept in a cookie for 90 days. */
export function referralLink(code: string) {
  return `${SITE.url}/r/${code}`;
}
