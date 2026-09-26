"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface InviteState {
  error?: string;
  link?: string;
}

export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = z
    .object({ email: z.string().email("Enter a valid email"), role: z.enum(["manager", "rep"]) })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({ org_id: viewer.org.id, email: parsed.data.email.toLowerCase(), role: parsed.data.role, invited_by: viewer.userId })
    .select("token")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { link: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${data.token}` };
}

export async function revokeInvite(id: string) {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", id);
  revalidatePath("/team");
}

export async function updateRole(membershipId: string, role: "manager" | "rep") {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("memberships").update({ role }).eq("id", membershipId).neq("role", "owner");
  revalidatePath("/team");
}

export interface AssignState {
  error?: string;
  ok?: boolean;
}

export async function createAssignment(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const parsed = z
    .object({
      assigned_to: z.string().min(1, "Pick a rep"),
      target_id: z.string().min(1, "Pick a target"),
      difficulty: z.enum(["warm", "inbound", "cold"]),
      required_calls: z.coerce.number().int().min(1).max(20),
      due_at: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    org_id: viewer.org.id,
    assigned_by: viewer.userId,
    assigned_to: parsed.data.assigned_to,
    target_id: parsed.data.target_id,
    difficulty: parsed.data.difficulty,
    required_calls: parsed.data.required_calls,
    due_at: parsed.data.due_at ? new Date(parsed.data.due_at).toISOString() : null,
    note: parsed.data.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAssignment(id: string) {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", id);
  revalidatePath("/team");
  revalidatePath("/dashboard");
}
