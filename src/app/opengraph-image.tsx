import { ogCard, OG_SIZE } from "@/lib/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: SITE.tagline, footer: "10 free calls, work email only" });
}
