/**
 * Prospect voices a manager can pick for a target. All are ElevenLabs premade voices, available on
 * every account. Run `pnpm elevenlabs:voices` to list what your account can see and add your own.
 */
export const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "woman", note: "Calm, measured, American" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "woman", note: "Warm, conversational, American" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "woman", note: "Friendly, upbeat, American" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "woman", note: "Confident, British" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "woman", note: "Soft, British" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "woman", note: "Strong, direct, American" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "man", note: "Deep, steady, American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "man", note: "Authoritative, British" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "man", note: "Warm, British" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "man", note: "Younger, casual, American" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "man", note: "Relaxed, Australian" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "man", note: "Friendly, mid-40s, American" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];
export const VOICE_IDS = VOICES.map((v) => v.id) as string[];
export const voiceById = (id: string | null | undefined) => VOICES.find((v) => v.id === id) ?? null;
