import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { VOICES } from "@/lib/domain/voices";

export const DRAFT_MODEL = "claude-sonnet-5";

const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

const DraftSchema = z.object({
  company_description: z.string().describe("Two or three sentences: what the company does, for whom, in plain words. No marketing adjectives."),
  product_description: z.string().describe("What a rep is selling on a cold call and the ask at the end of it. Two or three sentences. Include a price only if the site states one."),
  ideal_customer_profile: z.string().describe("Who reps call: titles, company size, industries, and one or two trigger events. Two sentences."),
  target: z.object({
    name: z.string().describe("A plausible full name for a typical buyer, not a real person."),
    gender: z.enum(["man", "woman"]),
    title: z.string(),
    company: z.string().describe("A fictional company that fits the ideal customer profile."),
    industry: z.string(),
    company_size: z.string().describe("A range such as 200–500 employees."),
    persona_notes: z.string().describe("Three or four sentences on temperament, what they care about this quarter, and how they treat cold callers."),
    pain_points: z.array(z.string()).min(2).max(4),
    objections: z.array(z.string()).min(3).max(5).describe("Objections this buyer would raise to this specific product."),
  }),
});

export type WorkspaceDraft = Omit<z.infer<typeof DraftSchema>, "target"> & {
  target: Omit<z.infer<typeof DraftSchema>["target"], "gender"> & { voice_id: string };
  usage: { input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number };
};

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?fc.*|\[?fd.*)$/i;

/** Normalises what a person types into an https URL, refusing anything that points inside a network. */
export function normaliseSite(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.username || url.password || url.port) return null;
  if (!url.hostname.includes(".") || PRIVATE_HOST.test(url.hostname) || isIP(url.hostname)) return null;
  url.hash = "";
  return url;
}

/** RFC 1918, loopback, link-local, CGNAT, IPv6 local and IPv4-mapped forms. */
function isPrivateAddress(ip: string) {
  const v4 = ip.replace(/^::ffff:/i, "");
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
  }
  const low = ip.toLowerCase();
  return low === "::1" || low === "::" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80");
}

/** A hostname is safe only if every address it resolves to is public: nip.io style names and split DNS both resolve inward. */
async function assertPublicHost(hostname: string) {
  const addrs = await lookup(hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error("host does not resolve");
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error("host resolves to a private address");
}

const MAX_BYTES = 1_000_000;
const MAX_HOPS = 3;

/** Plain text of a page: title, description and the visible copy, capped so the prompt stays small. */
export async function fetchSiteText(url: URL): Promise<string> {
  let current = url;
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await assertPublicHost(current.hostname);
    res = await fetch(current, {
      signal: AbortSignal.timeout(8_000),
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; 100DialsBot/1.0; +https://100dials.com)", accept: "text/html,application/xhtml+xml" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = normaliseSite(new URL(location, current).href);
      if (!next) throw new Error("redirected somewhere we will not follow");
      current = next;
      res = null;
      continue;
    }
    break;
  }
  if (!res) throw new Error("too many redirects");
  if (!res.ok) throw new Error(`site returned ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error("site is not an HTML page");
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("page too large");

  // Read at most MAX_BYTES whatever the headers claim.
  const reader = res.body?.getReader();
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (reader) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    received += value.byteLength;
    if (received >= MAX_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c)))).slice(0, 400_000);

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const description = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html)?.[1] ?? "";
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const text = [title && `Title: ${title.trim()}`, description && `Description: ${description.trim()}`, body].filter(Boolean).join("\n\n").slice(0, 9_000);
  if (text.length < 200) throw new Error("not enough readable text on the page");
  return text;
}

/** Claude turns a company's homepage into the context the prospects need plus one buyer to call first. */
export async function draftWorkspace(input: { orgName: string; site: string; text: string }): Promise<WorkspaceDraft> {
  const response = await client.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 1_500,
    system:
      "You set up sales-training workspaces. Given a company's homepage text, write the context an AI cold-call prospect needs about the seller, and design one realistic buyer for the seller's reps to practise on. Be concrete and plain. Use only what the page supports; where it is silent, make sensible industry-typical choices and keep them modest. Never invent customer names or statistics. British or American spelling to match the page.",
    messages: [{ role: "user", content: `Company: ${input.orgName}\nWebsite: ${input.site}\n\n<homepage>\n${input.text}\n</homepage>` }],
    output_config: { format: zodOutputFormat(DraftSchema) },
  });
  if (response.stop_reason === "refusal") throw new Error("draft refused");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("draft returned no parseable output");

  const pool = VOICES.filter((v) => v.gender === parsed.target.gender);
  const voice = pool[Math.floor(Math.random() * pool.length)] ?? VOICES[0];
  const { gender, ...target } = parsed.target;
  void gender;
  return {
    ...parsed,
    target: { ...target, voice_id: voice.id },
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, cache_read_tokens: response.usage.cache_read_input_tokens ?? 0, cache_write_tokens: response.usage.cache_creation_input_tokens ?? 0 },
  };
}
