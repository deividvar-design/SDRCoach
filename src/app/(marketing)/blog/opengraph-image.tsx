import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Cold calling, with the data attached.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "Cold calling, with the data attached.", kicker: "Blog" });
}
