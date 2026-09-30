import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Ten free calls. Then decide.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "Ten free calls. Then decide.", kicker: "Pricing" });
}
