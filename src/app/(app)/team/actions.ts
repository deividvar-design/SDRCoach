"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SALES_EMAIL } from "@/lib/billing/plans";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emailConfigured, sendMail } from "@/lib/email/send";
import { appUrl } from "@/lib/site";
import { templates } from "@/lib/email/templates";

export interface InviteState {
  error?: string;
  link?: string;
  /** Whether the invite email actually went out. False when email is not configured or the send failed. */
  emailed?: boolean;
  email?: string;
}

export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = z
    .object({ email: z.string().email("Enter a valid email"), role: z.enum(["manager", "rep"]) })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const viewer = await requireManager();
  const supabase = await createClient();

  const [{ count: members }, { count: pending }] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id),
    supabase.from("invites").select("id", { count: "exact", head: true }).eq("org_id", viewer.org.id).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  if ((members ?? 0) + (pending ?? 0) >= viewer.org.seat_limit) {
    if (viewer.org.plan === "trial") {
      return { error: `Trial workspaces have ${viewer.org.seat_limit} ${viewer.org.seat_limit === 1 ? "seat" : "seats"}. Email ${SALES_EMAIL} to add reps to the trial, or pick a plan.` };
    }
    return { error: `All ${viewer.org.seat_limit} seats are in use. Add seats under Settings → Manage billing.` };
  }

  const { data, error } = await supabase
    .from("invites")
    .insert({ org_id: viewer.org.id, email: parsed.data.email.toLowerCase(), role: parsed.data.role, invited_by: viewer.userId })
    .select("token")
    .single();
  if (error) return { error: error.message };

  const link = `${appUrl()}/invite/${data.token}`;
  const mail = templates.invite({ inviterName: viewer.profile.full_name ?? "Your manager", orgName: viewer.org.name, role: parsed.data.role, link });
  let emailed = false;
  if (emailConfigured()) {
    emailed = await sendMail({ to: parsed.data.email, ...mail })
      .then(() => true)
      .catch((err) => {
        console.error("invite email failed", err);
        return false;
      });
  }

  revalidatePath("/team");
  return { link, emailed, email: parsed.data.email };
}

export async function revokeInvite(id: string) {
  await requireManager();
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", id);
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
  const [{ data: member }, { data: target }] = await Promise.all([
    supabase.from("memberships").select("id").eq("org_id", viewer.org.id).eq("user_id", parsed.data.assigned_to).maybeSingle(),
    supabase.from("targets").select("id").eq("org_id", viewer.org.id).eq("id", parsed.data.target_id).maybeSingle(),
  ]);
  if (!member) return { error: "That person is not in your workspace." };
  if (!target) return { error: "That target is not in your workspace." };
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

/** Owners and managers can move anyone who is not the owner between rep and manager. */
/** Removes a member. Owners cannot be removed, nor can you remove yourself; use Leave workspace for that. */
export async function removeMember(membershipId: string): Promise<{ ok: true } | { error: string }> {
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data: target } = await supabase.from("memberships").select("id, user_id, role").eq("id", membershipId).eq("org_id", viewer.org.id).maybeSingle();
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") return { error: "The owner cannot be removed." };
  if (target.user_id === viewer.userId) return { error: "Use Leave workspace in Settings to remove yourself." };
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

export async function changeRole(membershipId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const role = z.enum(["manager", "rep"]).safeParse(formData.get("role"));
  if (!role.success) return { error: "Pick a role." };
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data: target } = await supabase.from("memberships").select("id, user_id, role").eq("id", membershipId).eq("org_id", viewer.org.id).maybeSingle();
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") return { error: "The owner's role cannot be changed." };
  if (target.user_id === viewer.userId) return { error: "You cannot change your own role." };
  const { error } = await supabase.from("memberships").update({ role: role.data }).eq("id", membershipId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}
