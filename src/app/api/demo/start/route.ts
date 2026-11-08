import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoAgentId, mintConversationToken } from "@/lib/elevenlabs/client";
import { currentDemo } from "@/lib/demo/session";
import { demoPrompt, KAREN, overDemoLimits } from "@/lib/demo/boss";
import { hashPrompt } from "@/lib/calls/finalize";
import { logFunnel } from "@/lib/funnel";

/** Mints are a state transition: at most two tokens per demo, so a cookie cannot be used to farm voice minutes. */
const MAX_MINTS = 2;

/** Mint the browser's voice token for the demo this cookie owns. */
export async function POST() {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "Start from the Karen page." }, { status: 401 });
  if (demo.status !== "created" && demo.status !== "dialing") return NextResponse.json({ error: "This call has already been made." }, { status: 409 });
  if (demo.mints >= MAX_MINTS) return NextResponse.json({ error: "This call could not connect. Start again from the Karen page." }, { status: 429 });
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) return NextResponse.json({ error: "Voice service is not configured." }, { status: 503 });

  const { prompt, firstMessage, voiceId, mood } = demoPrompt(demo);
  const db = createAdminClient();
  // Claim the mint first (optimistic on the counter), then talk to the voice provider.
  const { data: claimed } = await db
    .from("demo_calls")
    .update({ status: "dialing", mints: demo.mints + 1, prompt_hash: hashPrompt(prompt) })
    .eq("id", demo.id)
    .eq("mints", demo.mints)
    .in("status", ["created", "dialing"])
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: "Try again." }, { status: 409 });
  // The daily limits were checked when the row was made, but they count minted calls only, so rows made in a burst
  // all passed. Counted again here with this call included, and the call is dropped if it is one too many.
  if (demo.mints === 0 && (await overDemoLimits(db, { domain: demo.domain, ip: demo.ip, personal: demo.personal_email }))) {
    await db.from("demo_calls").update({ status: "failed", error: "limit at mint", prompt_hash: null }).eq("id", demo.id);
    return NextResponse.json({ error: "Karen has taken all the calls she'll take from here today. Come back tomorrow, or start a free trial." }, { status: 429 });
  }
  await logFunnel("karen_call_started", { email: demo.email, subject: demo.id, dedupeKey: `karen_started:${demo.id}`, meta: { personal: demo.personal_email } });

  let token: string;
  try {
    token = await mintConversationToken(demoAgentId());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice service unavailable" }, { status: 503 });
  }
  return NextResponse.json({ token, overrides: { prompt, firstMessage, voiceId }, ambience: mood.ambience, prospect: { name: KAREN.name, title: KAREN.title, company: KAREN.company } });
}
