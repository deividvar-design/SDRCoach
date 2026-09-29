/**
 * Lists the voices your ElevenLabs account can use, so you can check the ids in src/lib/domain/voices.ts
 * or add your own cloned voices there.
 *
 *   ELEVENLABS_API_KEY=... node scripts/elevenlabs-voices.mjs
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
const res = await client.voices.search({ pageSize: 100 });
for (const v of res.voices) {
  const labels = Object.entries(v.labels ?? {}).map(([k, val]) => `${k}=${val}`).join(" ");
  console.log(`${v.voiceId}  ${v.name.padEnd(14)} ${v.category ?? ""}  ${labels}`);
}
