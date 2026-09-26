import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1c1b19", color: "#f2efe8", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f2efe8", display: "flex", alignItems: "center", justifyContent: "center", color: "#1c1b19", fontSize: 18, fontWeight: 700, fontFamily: "sans-serif" }}>SC</div>
          {SITE.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, lineHeight: 1.02, letterSpacing: -2 }}>{SITE.tagline}</div>
          <div style={{ fontSize: 30, color: "#b8b3a8", fontFamily: "sans-serif" }}>AI cold-call training for SDR teams</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#b8b3a8", fontFamily: "sans-serif" }}>
          <span>10 free calls · work email only</span>
          <span style={{ color: "#f0623d" }}>● LIVE</span>
        </div>
      </div>
    ),
    size,
  );
}
