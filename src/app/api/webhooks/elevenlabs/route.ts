import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeCall } from "@/lib/calls/finalize";

export const maxDuration = 120;

/**
 * ElevenLabs post-call webhook. Belt and braces: the browser's /end call already triggers scoring,
 * this catches the case where the tab was closed mid-call.
 * Signature format: `ElevenLabs-Signature: t=<unix>,v0=<hex hmac-sha256 of "<unix>.<body>">`.
 */
function verify(body: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const v0 = parts.v0;
  if (!t || !v0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 30 * 60) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 501 });

  const body = await request.text();
  if (!verify(body, request.headers.get("elevenlabs-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: { type?: string; data?: { conversation_id?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (payload.type !== "post_call_transcription" || !payload.data?.conversation_id) return NextResponse.json({ ok: true });

  const db = createAdminClient();
  const { data: session } = await db.from("call_sessions").select("id, status").eq("elevenlabs_conversation_id", payload.data.conversation_id).maybeSingle();
  if (session && session.status !== "scored" && session.status !== "scoring" && session.status !== "collected") {
    after(async () => {
      try {
        await finalizeCall(session.id);
      } catch (err) {
        console.error("webhook finalize failed", session.id, err);
      }
    });
  }
  return NextResponse.json({ ok: true });
}
