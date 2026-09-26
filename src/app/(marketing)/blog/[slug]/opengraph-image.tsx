import { ImageResponse } from "next/og";
import { getPost } from "@/lib/blog";
import { SITE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? SITE.name;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f7f5f0", color: "#1c1b19", fontFamily: "serif" }}>
        <div style={{ fontSize: 26, color: "#6b665c", fontFamily: "sans-serif", letterSpacing: 3 }}>SDRCOACH BLOG</div>
        <div style={{ fontSize: title.length > 50 ? 64 : 80, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#6b665c", fontFamily: "sans-serif" }}>
          <span>{post ? `${post.readingMinutes} min read` : ""}</span>
          <span>{SITE.url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    ),
    size,
  );
}
