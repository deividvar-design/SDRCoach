import { ogCard, OG_SIZE } from "@/lib/og";
import { getPost } from "@/lib/blog";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogCard({ title: post?.title ?? "SDRCoach blog", kicker: "From the SDRCoach blog", footer: post ? `${post.readingMinutes} min read` : undefined });
}
