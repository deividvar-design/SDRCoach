import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Stop ramping reps on your real pipeline.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return ogCard({ title: "Stop ramping reps on your real pipeline.", kicker: "For sales managers" });
}
