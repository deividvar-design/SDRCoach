"use server";

import { after } from "next/server";
import { reportError } from "@/lib/sentry";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { digestKnowledgeSource } from "@/lib/knowledge/digest";
import { fileToText } from "@/lib/knowledge/parse";

export interface KnowledgeState {
  error?: string;
  ok?: boolean;
}

const KIND = z.enum(["call_transcript", "script", "playbook", "objection_sheet"]);
const MAX_BYTES = 8 * 1024 * 1024;
/** Sources a workspace can hold, by plan. The pricing page states these numbers; keep them in sync. */
const MAX_SOURCES: Record<string, number> = { trial: 10, starter: 30, team: 100, enterprise: 250 };
const MAX_PER_DAY = 20;

/** Digests run on the strongest model; cap how many sources a workspace can hold and add per day. */
async function checkCaps(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, plan: string, adding: number): Promise<string | null> {
  const cap = MAX_SOURCES[plan] ?? MAX_SOURCES.starter!;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: total }, { count: today }] = await Promise.all([
    supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("org_id", orgId).gt("created_at", since),
  ]);
  if ((total ?? 0) + adding > cap) return plan === "trial" || plan === "starter" ? `${plan === "trial" ? "Trial" : "Starter"} workspaces can hold ${cap} sources. Remove one, or upgrade for more.` : `This workspace can hold ${cap} sources. Remove one first.`;
  if ((today ?? 0) + adding > MAX_PER_DAY) return `You can add ${MAX_PER_DAY} sources a day. Try again tomorrow.`;
  return null;
}

function scheduleDigest(id: string) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  after(async () => {
    try {
      await digestKnowledgeSource(id);
    } catch (err) {
      reportError(err, { where: "digest", extra: { sourceId: id } });
    }
  });
}

export async function addKnowledgeText(_prev: KnowledgeState, formData: FormData): Promise<KnowledgeState> {
  const parsed = z
    .object({ name: z.string().min(2, "Give it a name"), kind: KIND, raw_text: z.string().min(50, "Paste at least a few lines") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const capped = await checkCaps(supabase, viewer.org.id, viewer.org.plan, 1);
  if (capped) return { error: capped };
  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({ org_id: viewer.org.id, uploaded_by: viewer.userId, ...parsed.data, status: "pending" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  scheduleDigest(data.id);
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function uploadKnowledgeFiles(_prev: KnowledgeState, formData: FormData): Promise<KnowledgeState> {
  const kind = KIND.safeParse(formData.get("kind"));
  if (!kind.success) return { error: "Pick a type" };
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one CSV or text file" };

  const viewer = await requireManager();
  const supabase = await createClient();
  const capped = await checkCaps(supabase, viewer.org.id, viewer.org.plan, files.length);
  if (capped) return { error: capped };

  for (const file of files) {
    if (file.size > MAX_BYTES) return { error: `${file.name} is over 8 MB` };
    const lower = file.name.toLowerCase();
    if (!/\.(csv|txt|md|tsv)$/.test(lower)) return { error: `${file.name}: only CSV, TSV, TXT or MD files` };

    const raw = await file.text();
    const text = fileToText(file.name, lower.endsWith(".tsv") ? raw.replace(/\t/g, ",") : raw);
    if (text.trim().length < 50) return { error: `${file.name} looks empty` };

    const path = `${viewer.org.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("knowledge").upload(path, file, { contentType: file.type || "text/plain" });
    if (upErr) return { error: upErr.message };

    const { data, error } = await supabase
      .from("knowledge_sources")
      .insert({ org_id: viewer.org.id, uploaded_by: viewer.userId, name: file.name, kind: kind.data, storage_path: path, raw_text: text, status: "pending" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    scheduleDigest(data.id);
  }

  revalidatePath("/knowledge");
  return { ok: true };
}

export async function retryDigest(id: string) {
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data } = await supabase.from("knowledge_sources").update({ status: "pending", error: null }).eq("id", id).eq("org_id", viewer.org.id).select("id").maybeSingle();
  if (data) scheduleDigest(data.id);
  revalidatePath("/knowledge");
}

export async function deleteKnowledge(id: string) {
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data } = await supabase.from("knowledge_sources").select("storage_path").eq("id", id).eq("org_id", viewer.org.id).maybeSingle();
  if (data?.storage_path) await supabase.storage.from("knowledge").remove([data.storage_path]);
  await supabase.from("knowledge_sources").delete().eq("id", id);
  revalidatePath("/knowledge");
}
