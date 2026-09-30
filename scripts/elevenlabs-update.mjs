/**
 * Brings an existing prospect agent up to date. Safe to re-run.
 *
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=... node scripts/elevenlabs-update.mjs
 *
 * Sets: turn timeout 6s, the gatekeeper voices the agent may switch to, the TTS model from
 * ELEVENLABS_TTS_MODEL (falls back to eleven_flash_v2 if the API refuses it), and the override permissions.
 */
import { readFileSync, existsSync } from "node:fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  console.error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set");
  process.exit(1);
}
const client = new ElevenLabsClient({ apiKey });
const wantedModel = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2";

// Must match GATEKEEPER_VOICES in src/lib/domain/moods.ts.
const supportedVoices = [
  { label: "Receptionist", voiceId: "21m00Tcm4TlvDq8ikWAM", description: "A receptionist or assistant, woman" },
  { label: "Assistant", voiceId: "TxGEqnHWrfWFTfGW9XjX", description: "A receptionist or assistant, man" },
];

async function update(modelId) {
  return client.conversationalAi.agents.update(agentId, {
    name: "100 Dials Prospect",
    conversationConfig: {
      tts: { modelId, supportedVoices },
      turn: { turnTimeout: 6, silenceEndCallTimeout: 25 },
    },
    platformSettings: {
      overrides: {
        conversationConfigOverride: {
          agent: { prompt: { prompt: true }, firstMessage: true, language: true },
          tts: { voiceId: true },
        },
      },
    },
  });
}

try {
  await update(wantedModel);
  console.log(`Agent ${agentId} updated: tts ${wantedModel}, turn timeout 6s, ${supportedVoices.length} gatekeeper voices.`);
  if (wantedModel !== "eleven_flash_v2") console.log(`Set ELEVENLABS_TTS_MODEL=${wantedModel} in Vercel so the prompt uses delivery tags.`);
} catch (err) {
  const msg = err?.body?.detail?.message ?? err?.message ?? String(err);
  if (wantedModel !== "eleven_flash_v2") {
    console.warn(`The API refused ${wantedModel}: ${msg}\nRetrying with eleven_flash_v2.`);
    await update("eleven_flash_v2");
    console.log(`Agent ${agentId} updated with eleven_flash_v2. Leave ELEVENLABS_TTS_MODEL unset.`);
  } else {
    console.error(msg);
    process.exit(1);
  }
}
