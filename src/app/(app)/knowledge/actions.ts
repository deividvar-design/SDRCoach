"use server";

import { after } from "next/server";
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

function scheduleDigest(id: string) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  after(async () => {
    try {
      await digestKnowledgeSource(id);
    } catch (err) {
      console.error("digest failed", id, err);
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
