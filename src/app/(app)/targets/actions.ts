"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VOICE_IDS } from "@/lib/domain/voices";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface TargetState {
  error?: string;
  ok?: boolean;
}

/** One item per line, at most 20 items of 200 characters: these feed the prospect and grader prompts. */
const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 20);

const targetSchema = z.object({
  name: z.string().min(2, "Prospect name is required").max(120),
  title: z.string().min(2, "Job title is required").max(120),
  company: z.string().min(1, "Company is required").max(120),
  industry: z.string().max(120).optional(),
  company_size: z.string().max(60).optional(),
  persona_notes: z.string().max(2000, "Persona notes: keep it under 2,000 characters").optional(),
  kind: z.enum(["real", "practice"]).default("real"),
  voice_id: z.string().optional(),
});

export async function createTarget(_prev: TargetState, formData: FormData): Promise<TargetState> {
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.from("targets").insert({
    org_id: viewer.org.id,
    created_by: viewer.userId,
    ...parsed.data,
    industry: parsed.data.industry || null,
    company_size: parsed.data.company_size || null,
    persona_notes: parsed.data.persona_notes || null,
    voice_id: parsed.data.voice_id && VOICE_IDS.includes(parsed.data.voice_id) ? parsed.data.voice_id : null,
    pain_points: lines(formData.get("pain_points")),
    objections: lines(formData.get("objections")),
  });
  if (error) return { error: error.message };

  revalidatePath("/targets");
  return { ok: true };
}


export async function updateTarget(id: string, _prev: TargetState, formData: FormData): Promise<TargetState> {
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { error } = await supabase
    .from("targets")
    .update({
      ...parsed.data,
      industry: parsed.data.industry || null,
      company_size: parsed.data.company_size || null,
      persona_notes: parsed.data.persona_notes || null,
      voice_id: parsed.data.voice_id && VOICE_IDS.includes(parsed.data.voice_id) ? parsed.data.voice_id : null,
      pain_points: lines(formData.get("pain_points")),
      objections: lines(formData.get("objections")),
    })
    .eq("id", id)
    .eq("org_id", viewer.org.id);
  if (error) return { error: error.message };

  revalidatePath("/targets");
  revalidatePath(`/targets/${id}`);
  return { ok: true };
}

export async function archiveTargetAndReturn(id: string) {
  const viewer = await requireManager();
  const supabase = await createClient();
  await supabase.from("targets").update({ is_archived: true }).eq("id", id).eq("org_id", viewer.org.id);
  revalidatePath("/targets");
  redirect("/targets");
}
