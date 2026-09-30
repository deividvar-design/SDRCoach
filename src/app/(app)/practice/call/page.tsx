import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import type { Difficulty } from "@/types/database";
import { CallScreen } from "./call-screen";

export const metadata = { title: "Live call" };

export default async function CallPage({ searchParams }: PageProps<"/practice/call">) {
  const { target, difficulty, assignment } = await searchParams;
  const viewer = await requireViewer();
  const level = typeof difficulty === "string" && difficulty in LEVELS ? (difficulty as Difficulty) : "warm";
  // The notice must be confirmed before any call, including deep links straight to this page.
  if (!viewer.profile.recording_ack_at) redirect("/practice");
  if (typeof target !== "string") redirect("/practice");

  const supabase = await createClient();
  const { data: t } = await supabase.from("targets").select("id, name, title, company, industry, persona_notes, kind").eq("id", target).eq("org_id", viewer.org.id).maybeSingle();
  if (!t) redirect("/practice");

  return (
    <CallScreen
      target={t}
      difficulty={level}
      level={LEVELS[level]}
      assignmentId={typeof assignment === "string" ? assignment : null}
      voiceConfigured={Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID)}
    />
  );
}
