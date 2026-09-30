import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Your call library is a training ground.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "Your call library is a training ground.", kicker: "For sales enablement" });
}
