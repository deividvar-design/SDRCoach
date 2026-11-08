/**
 * One-time setup: creates the 100 Dials prospect agent in your ElevenLabs workspace.
 * Every call overrides the prompt, first message and voice per target, so one agent serves all orgs.
 *
 *   ELEVENLABS_API_KEY=... node scripts/elevenlabs-setup.mjs
 *
 * Prints the agent id. Put it in ELEVENLABS_AGENT_ID.
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
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is not set");
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey });
const llm = process.env.ELEVENLABS_AGENT_LLM ?? "claude-sonnet-5";

const OUTCOMES = ["meeting_booked", "callback", "info_sent", "rejected", "hung_up", "incomplete"];

// `--demo-agent`: a second agent for the public Karen demo. Same brief, but the conversation itself is capped server-side,
// so a visitor who disables the page timer still cannot run up more than about three minutes.
const demo = process.argv.includes("--demo-agent");

const res = await client.conversationalAi.agents.create({
  name: demo ? "100 Dials Karen demo" : "100 Dials Prospect",
  conversationConfig: {
    agent: {
      firstMessage: "Hello?",
      language: "en",
      prompt: {
        prompt: "You are a prospect on a sales call. 100 Dials replaces this prompt on every call.",
        llm,
        temperature: 0.7,
        builtInTools: {
          endCall: {
            type: "system",
            name: "end_call",
            params: { systemToolType: "end_call" },
            description: "Hangs up the phone immediately and for good. There is no test, draft or placeholder use: every call to this tool disconnects the rep at once. Use it only after you have said your final closing line and mean to end the call. If you want to keep talking, or you are waiting for the rep to answer, just speak and do not use this tool.",
          },
        },
      },
    },
    tts: {
      modelId: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      // Voices the prospect may switch to mid-call (the gatekeeper). Must match GATEKEEPER_VOICES in src/lib/domain/moods.ts.
      supportedVoices: [
        { label: "Receptionist", voiceId: "21m00Tcm4TlvDq8ikWAM", description: "A receptionist or assistant, woman" },
        { label: "Assistant", voiceId: "TxGEqnHWrfWFTfGW9XjX", description: "A receptionist or assistant, man" },
      ],
    },
    // Seconds of rep silence before the prospect speaks again. Twelve felt like talking to a wall; six is a person going "hello?".
    turn: { turnTimeout: 6, silenceEndCallTimeout: 25 },
    conversation: { maxDurationSeconds: demo ? 200 : 900 },
  },
  platformSettings: {
    // Only sessions started with a server-minted token may connect; the agent id alone is useless.
    auth: { enableAuth: true },
    overrides: {
      conversationConfigOverride: {
        agent: { prompt: { prompt: true }, firstMessage: true, language: true },
        tts: { voiceId: true },
      },
    },
    dataCollection: {
      outcome: {
        type: "string",
        description: `How the prospect (the agent) decided the call should end, judged strictly from the prospect's own final words. One of: ${OUTCOMES.join(", ")}. meeting_booked = agreed to a specific meeting or follow-up call; callback = asked the rep to call again later; info_sent = asked for an email or information instead of a meeting; rejected = clearly said no; hung_up = ended the call abruptly without a decision; incomplete = the call ended for another reason.`,
        enum: OUTCOMES,
      },
      outcome_reason: {
        type: "string",
        description: "One sentence, in the prospect's own voice, explaining why they made that decision.",
      },
    },
  },
});

console.log(`\nAgent created: ${res.agentId}\n\nAdd to your environment:\n${demo ? "ELEVENLABS_DEMO_AGENT_ID" : "ELEVENLABS_AGENT_ID"}=${res.agentId}\n`);
