import { ImageResponse } from "next/og";
import { coachLine, publicScorecard, survivedLabel } from "@/lib/demo/share";

export const alt = "Karen scorecard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await publicScorecard(slug);
  const survived = survivedLabel(card?.duration_seconds);
  const name = card?.display_name ? (card.display_company ? `${card.display_name}, ${card.display_company}` : card.display_name) : "A rep";
  const line = coachLine(card?.score?.coach_summary);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#1c1b19", color: "#f7f5f0", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 24, letterSpacing: 2, color: "#a9a49a" }}>
          <span>BOSS FIGHT · KAREN</span>
          <span>100DIALS.COM</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 56, lineHeight: 1.1 }}>{name} survived Karen for</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 32, marginTop: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 180, lineHeight: 1, color: "#ff4a1c" }}>{survived}</span>
            <span style={{ fontSize: 48, color: "#a9a49a" }}>{Number(card?.overall ?? 0).toFixed(1)} / 10</span>
          </div>
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.3, color: "#d9d4c8" }}>{line ? `“${line}”` : "Karen's on the line. You have three minutes."}</div>
      </div>
    ),
    size,
  );
}
