"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminState {
  error?: string;
  ok?: string;
}

async function log(adminEmail: string, orgId: string, action: string, payload: Record<string, string | number | boolean | null>) {
  await createAdminClient().from("admin_actions").insert({ admin_email: adminEmail, org_id: orgId, action, payload });
}

export async function extendTrial(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = z.object({ days: z.coerce.number().int().min(0).max(365), calls: z.coerce.number().int().min(0).max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter whole numbers." };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("trial_ends_at, trial_call_limit").eq("id", orgId).single();
  if (!org) return { error: "Workspace not found." };
  const base = Math.max(Date.now(), new Date(org.trial_ends_at).getTime());
  const patch = {
    trial_ends_at: new Date(base + parsed.data.days * 86_400_000).toISOString(),
    trial_call_limit: org.trial_call_limit + parsed.data.calls,
    plan: "trial",
  };
  const { error } = await db.from("organizations").update(patch).eq("id", orgId);
  if (error) return { error: error.message };
  await log(admin.email, orgId, "extend_trial", { ...parsed.data, ...patch });
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
  return { ok: `Trial extended by ${parsed.data.days} days and ${parsed.data.calls} calls.` };
}

export async function setPlan(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = z
    .object({ plan: z.enum(["trial", "starter", "team", "enterprise", "canceled"]), seat_limit: z.coerce.number().int().min(1).max(1000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a plan and a whole number of seats." };
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("organizations").update(parsed.data).eq("id", orgId);
  if (error) return { error: error.message };
  await log(admin.email, orgId, "set_plan", parsed.data);
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin");
  return { ok: `Plan set to ${parsed.data.plan} with ${parsed.data.seat_limit} seats. Stripe was not changed.` };
}

export async function addNote(orgId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return { error: "Write something." };
  const admin = await requireAdmin();
  await log(admin.email, orgId, "note", { note });
  revalidatePath(`/admin/orgs/${orgId}`);
  return { ok: "Noted." };
}
