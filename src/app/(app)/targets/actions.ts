"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface TargetState {
  error?: string;
  ok?: boolean;
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const targetSchema = z.object({
  name: z.string().min(2, "Prospect name is required"),
  title: z.string().min(2, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  persona_notes: z.string().optional(),
  kind: z.enum(["real", "practice"]).default("real"),
});

export async function createTarget(_prev: TargetState, formData: FormData): Promise<TargetState> {
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("targets").insert({
    org_id: viewer.org.id,
    created_by: viewer.userId,
    ...parsed.data,
    industry: parsed.data.industry || null,
    company_size: parsed.data.company_size || null,
    persona_notes: parsed.data.persona_notes || null,
    pain_points: lines(formData.get("pain_points")),
    objections: lines(formData.get("objections")),
  });
  if (error) return { error: error.message };

  revalidatePath("/targets");
  return { ok: true };
}

export async function archiveTarget(id: string) {
  const supabase = await createClient();
  await supabase.from("targets").update({ is_archived: true }).eq("id", id);
  revalidatePath("/targets");
}
