"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { elevenlabs } from "@/lib/elevenlabs/client";
import { AMBIENCE_PROMPTS, isAmbienceKind } from "@/lib/audio/ambience-library";

export interface GenerateState {
  ok?: boolean;
  error?: string;
}

/**
 * Asks ElevenLabs for a 30-second seamless loop of one place and stores it as `ambience/<place>.mp3`, replacing the
 * old one. Calls pick it up on their next dial (the CDN may serve the old file for up to five minutes).
 */
export async function generateAmbience(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (!isAmbienceKind(kind)) return { error: "Unknown place." };
  if (!process.env.ELEVENLABS_API_KEY) return { error: "ELEVENLABS_API_KEY is not set." };
  try {
    const stream = await (await elevenlabs()).textToSoundEffects.convert({
      text: AMBIENCE_PROMPTS[kind],
      durationSeconds: 30,
      loop: true,
      modelId: "eleven_text_to_sound_v2",
      promptInfluence: 0.6,
    });
    const audio = Buffer.from(await new Response(stream as ReadableStream).arrayBuffer());
    if (audio.length < 10_000) return { error: "ElevenLabs returned an empty clip. Try again." };
    const { error } = await createAdminClient().storage.from("ambience").upload(`${kind}.mp3`, audio, { contentType: "audio/mpeg", upsert: true, cacheControl: "300" });
    if (error) return { error: `Saving failed: ${error.message}` };
    revalidatePath("/admin/sounds");
    return { ok: true };
  } catch (err) {
    const e = err as { body?: { detail?: { message?: string } }; message?: string };
    return { error: e.body?.detail?.message ?? e.message ?? "Generation failed." };
  }
}
