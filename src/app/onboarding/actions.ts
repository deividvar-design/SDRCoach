"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateBusinessEmail } from "@/lib/email/business";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { after } from "next/server";

export interface OnboardingState {
  error?: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createOrganization(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = z.object({ name: z.string().min(2, "Give your company a name") }).safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // Self-serve workspaces (trials) are for business addresses only. Invited users never reach this page.
  const check = await validateBusinessEmail(user.email);
  if (!check.ok) return { error: check.message };

  const base = slugify(parsed.data.name) || "team";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const db = process.env.SDRCOACH_DEMO === "1" ? supabase : createAdminClient();
  const { data: orgId, error } = await db.rpc("create_organization", { p_name: parsed.data.name, p_slug: slug, p_user_id: user.id, p_trial_domain: check.domain });
  if (!error && orgId && process.env.SDRCOACH_DEMO !== "1") {
    after(() => sendLifecycle(orgId, "welcome").catch((err) => console.error("welcome email failed", err)));
  }
  if (error) {
    if (error.message.includes("trial_exists")) return { error: `A workspace for ${check.domain} already exists. Ask its owner to invite you.` };
    return { error: error.message };
  }

  redirect("/onboarding/context");
}

export async function saveCompanyContext(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = z
    .object({
      company_description: z.string().min(20, "A sentence or two about what you do"),
      product_description: z.string().min(20, "A sentence or two about what reps sell"),
      ideal_customer_profile: z.string().min(10, "Who do you call?"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const { error } = await supabase.from("organizations").update(parsed.data).eq("id", membership.org_id);
  if (error) return { error: error.message };
  redirect("/dashboard?welcome=1");
}
