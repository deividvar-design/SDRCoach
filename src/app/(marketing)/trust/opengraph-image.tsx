import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "How we handle your calls and data.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "How we handle your calls and data.", kicker: "Trust and security" });
}
