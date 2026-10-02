import { ogCard, OG_SIZE } from "@/lib/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: Karen's on the line. You have three minutes.`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "Karen's on the line. You have three minutes.", kicker: "Cold call training for SDR teams", footer: "10 free calls, work email only" });
}
