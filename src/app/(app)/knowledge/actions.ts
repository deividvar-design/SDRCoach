"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface KnowledgeState {
  error?: string;
  ok?: boolean;
}

export async function addKnowledgeText(_prev: KnowledgeState, formData: FormData): Promise<KnowledgeState> {
  const parsed = z
    .object({
      name: z.string().min(2, "Give it a name"),
      kind: z.enum(["call_transcript", "script", "playbook", "objection_sheet"]),
      raw_text: z.string().min(50, "Paste at least a few lines"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_sources").insert({
    org_id: viewer.org.id,
    uploaded_by: viewer.userId,
    ...parsed.data,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/knowledge");
  return { ok: true };
}

export async function deleteKnowledge(id: string) {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("knowledge_sources").delete().eq("id", id);
  revalidatePath("/knowledge");
}
