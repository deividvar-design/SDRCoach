"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireManager, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  error?: string;
  ok?: boolean;
}

export async function updateOrganization(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = z
    .object({
      name: z.string().min(2),
      company_description: z.string().optional(),
      product_description: z.string().optional(),
      ideal_customer_profile: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      company_description: parsed.data.company_description || null,
      product_description: parsed.data.product_description || null,
      ideal_customer_profile: parsed.data.ideal_customer_profile || null,
    })
    .eq("id", viewer.org.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = z.object({ full_name: z.string().min(2) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", viewer.userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWorkspace(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await requireViewer();
  if (viewer.membership.role !== "owner") return { error: "Only the workspace owner can delete it." };
  if (String(formData.get("confirm") ?? "").trim() !== viewer.org.slug) return { error: `Type ${viewer.org.slug} to confirm.` };

  const supabase = await createClient();
  // Storage first (no cascade there), then the org row; every table cascades from organizations.
  const { data: files } = await supabase.storage.from("knowledge").list(viewer.org.id, { limit: 1000 });
  if (files?.length) await supabase.storage.from("knowledge").remove(files.map((f) => `${viewer.org.id}/${f.name}`));
  const { error } = await supabase.from("organizations").delete().eq("id", viewer.org.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

export async function leaveWorkspace() {
  const viewer = await requireViewer();
  if (viewer.membership.role === "owner") return;
  const supabase = await createClient();
  await supabase.from("memberships").delete().eq("id", viewer.membership.id);
  await supabase.auth.signOut();
  redirect("/login");
}
