import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentId, mintConversationToken } from "@/lib/elevenlabs/client";
import { currentDemo } from "@/lib/demo/session";
import { demoPrompt, KAREN } from "@/lib/demo/boss";
import { hashPrompt } from "@/lib/calls/finalize";

/** Mint the browser's voice token for the demo this cookie owns. Once per demo. */
export async function POST() {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "Start from the Karen page." }, { status: 401 });
  if (demo.status !== "created") return NextResponse.json({ error: "This call has already been made." }, { status: 409 });
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) return NextResponse.json({ error: "Voice service is not configured." }, { status: 503 });

  let token: string;
  try {
    token = await mintConversationToken();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice service unavailable" }, { status: 503 });
  }

  const { prompt, firstMessage, voiceId } = demoPrompt(demo);
  await createAdminClient().from("demo_calls").update({ prompt_hash: hashPrompt(prompt) }).eq("id", demo.id).eq("status", "created");
  void agentId();
  return NextResponse.json({ token, overrides: { prompt, firstMessage, voiceId }, prospect: { name: KAREN.name, title: KAREN.title, company: KAREN.company } });
}
