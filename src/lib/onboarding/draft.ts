import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
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
  if (!url.hostname.includes(".") || PRIVATE_HOST.test(url.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return null;
  url.hash = "";
  return url;
}

/** Plain text of a page: title, description and the visible copy, capped so the prompt stays small. */
export async function fetchSiteText(url: URL): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (compatible; 100DialsBot/1.0; +https://100dials.com)", accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`site returned ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error("site is not an HTML page");
  const html = (await res.text()).slice(0, 400_000);

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
  return { ...parsed, target: { ...target, voice_id: voice.id } };
}
