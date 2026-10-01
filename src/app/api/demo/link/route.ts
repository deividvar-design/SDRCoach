import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentDemo } from "@/lib/demo/session";

/** The browser connected: record the conversation id so the transcript can be fetched later. */
export async function POST(request: Request) {
  const demo = await currentDemo();
  if (!demo) return NextResponse.json({ error: "No demo" }, { status: 401 });
  const body = z.object({ conversationId: z.string().min(1).max(200) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { data } = await createAdminClient()
    .from("demo_calls")
    .update({ status: "live", elevenlabs_conversation_id: body.data.conversationId, started_at: new Date().toISOString() })
    .eq("id", demo.id)
    .eq("status", "created")
    .select("id")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not waiting to start" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
