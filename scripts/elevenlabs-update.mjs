/**
 * Brings an existing prospect agent up to date. Safe to re-run.
 *
 *   ELEVENLABS_API_KEY=... ELEVENLABS_AGENT_ID=... node scripts/elevenlabs-update.mjs
 *   add --tools-only to refresh just the end_call tool description
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

/**
 * --tools-only: refresh the hang-up tool's description (and the base prompt text) and touch nothing else, so the
 * voice model and voices stay as they are. Run it once per agent (workspace and Karen).
 */
const END_CALL_DESCRIPTION = "Hangs up the phone immediately and for good. There is no test, draft or placeholder use: every call to this tool disconnects the rep at once. Use it only after you have said your final closing line and mean to end the call. If you want to keep talking, or you are waiting for the rep to answer, just speak and do not use this tool.";
if (process.argv.includes("--tools-only")) {
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: {
      agent: {
        prompt: {
          prompt: "You are a prospect on a sales call. 100 Dials replaces this prompt on every call.",
          builtInTools: {
            endCall: { type: "system", name: "end_call", params: { systemToolType: "end_call" }, description: END_CALL_DESCRIPTION },
          },
        },
      },
    },
  });
  console.log(`Agent ${agentId}: end_call description updated. Voice model and voices unchanged.`);
  process.exit(0);
}

try {
  await update(wantedModel);
  console.log(`Agent ${agentId} updated: tts ${wantedModel}, turn timeout 6s, ${supportedVoices.length} gatekeeper voices.`);
  console.log("Now set GATEKEEPER_RATE=0.35 in Vercel and redeploy to turn gatekeepers on.");
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
