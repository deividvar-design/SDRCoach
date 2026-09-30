import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

/** One look for every share card: ink on paper, the page's headline, the product name small. */
export function ogCard({ title, kicker, footer }: { title: string; kicker?: string; footer?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f7f5f0", color: "#1c1b19", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#1c1b19", display: "flex", alignItems: "center", justifyContent: "center", color: "#f7f5f0", fontSize: 15, fontWeight: 700, fontFamily: "sans-serif" }}>100</div>
          <div style={{ display: "flex", flexDirection: "column" }}><span>{SITE.name}</span><span style={{ fontSize: 16, color: "#6b665c", fontFamily: "sans-serif" }}>{SITE.descriptor}</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {kicker && <div style={{ fontSize: 26, color: "#6b665c", fontFamily: "sans-serif" }}>{kicker}</div>}
          <div style={{ fontSize: title.length > 60 ? 64 : 84, lineHeight: 1.04, letterSpacing: -2 }}>{title}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6b665c", fontFamily: "sans-serif" }}>
          <span>{footer ?? "Cold Call Coach for SDR teams"}</span>
          <span style={{ color: "#2f4fd8" }}>● live</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
