"use server";

import { redirect } from "next/navigation";
import { reportError } from "@/lib/sentry";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateBusinessEmail } from "@/lib/email/business";
import { sendLifecycle } from "@/lib/email/lifecycle";
import { after } from "next/server";
import { PRACTICE_PERSONAS } from "@/content/practice-personas";
import { isAdminEmail } from "@/lib/auth";
import { track } from "@vercel/analytics/server";
import { draftWorkspace, fetchSiteText, normaliseSite, type WorkspaceDraft } from "@/lib/onboarding/draft";
import { VOICE_IDS } from "@/lib/domain/voices";

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
  const parsed = z
    .object({ name: z.string().min(2, "Give your company a name"), website: z.string().max(200).optional() })
    .safeParse({ name: formData.get("name"), website: formData.get("website") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const site = parsed.data.website ? normaliseSite(parsed.data.website) : null;
  if (parsed.data.website && !site) return { error: "That website address doesn't look right. Try the form example.com." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // Self-serve workspaces (trials) are for business addresses only. Invited users never reach this page.
  // Founders are exempt so they can test with any address; their workspace holds no trial domain.
  const admin = isAdminEmail(user.email);
  const check = admin ? ({ ok: true, domain: null } as const) : await validateBusinessEmail(user.email);
  if (!check.ok) return { error: check.message };

  const base = slugify(parsed.data.name) || "team";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const db = process.env.SDRCOACH_DEMO === "1" ? supabase : createAdminClient();
  const { data: orgId, error } = await db.rpc("create_organization", { p_name: parsed.data.name, p_slug: slug, p_user_id: user.id, p_trial_domain: check.domain });
  if (!error && orgId) {
    await db.from("targets").insert(
      PRACTICE_PERSONAS.map((p) => ({ ...p, pain_points: [...p.pain_points], objections: [...p.objections], org_id: orgId, created_by: user.id, kind: "practice" as const })),
    );
    if (process.env.SDRCOACH_DEMO !== "1") after(() => sendLifecycle(orgId, "welcome").catch((err) => reportError(err, { where: "welcome_email", orgId })));
    await track("workspace_created", { with_site: Boolean(site) }).catch(() => {});
  }
  if (error) {
    if (error.message.includes("trial_exists")) return { error: `A workspace for ${check.domain} already exists. Ask its owner to invite you.` };
    return { error: error.message };
  }

  redirect(site ? `/onboarding/context?site=${encodeURIComponent(site.href)}` : "/onboarding/context");
}

export type DraftResult = { draft: WorkspaceDraft; site: string } | { error: string };

/** Reads the company's homepage and drafts the context plus a first buyer. Nothing is saved until the form is submitted. */
export async function draftFromWebsite(website: string): Promise<DraftResult> {
  const site = normaliseSite(website);
  if (!site) return { error: "That website address doesn't look right. Try the form example.com." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("org_id, organizations(name)").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  let text: string;
  try {
    text = await fetchSiteText(site);
  } catch (err) {
    reportError(err, { where: "onboarding_fetch_site", orgId: membership.org_id, extra: { site: site.href } });
    return { error: `We couldn't read ${site.hostname}. Fill in the boxes by hand, it takes two minutes.` };
  }
  try {
    const draft = await draftWorkspace({ orgName: membership.organizations?.name ?? site.hostname, site: site.href, text });
    return { draft, site: site.hostname };
  } catch (err) {
    reportError(err, { where: "onboarding_draft", orgId: membership.org_id, extra: { site: site.href } });
    return { error: "The draft didn't come through. Fill in the boxes by hand, it takes two minutes." };
  }
}

const starterTarget = z.object({
  name: z.string().min(2).max(120),
  title: z.string().min(2).max(120),
  company: z.string().min(1).max(120),
  industry: z.string().max(120),
  company_size: z.string().max(60),
  persona_notes: z.string().max(2000),
  pain_points: z.array(z.string().max(200)).max(20),
  objections: z.array(z.string().max(200)).max(20),
  voice_id: z.string(),
});

export async function saveCompanyContext(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = z
    .object({
      company_description: z.string().min(20, "A sentence or two about what you do").max(2000, "Keep it under 2,000 characters"),
      product_description: z.string().min(20, "A sentence or two about what reps sell").max(2000, "Keep it under 2,000 characters"),
      ideal_customer_profile: z.string().min(10, "Who do you call?").max(2000, "Keep it under 2,000 characters"),
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

  // A buyer drafted from the website becomes the first target, and the owner lands on the call screen with it selected.
  const raw = formData.get("starter_target");
  if (typeof raw === "string" && raw) {
    let target: z.infer<typeof starterTarget> | null = null;
    try {
      target = starterTarget.parse(JSON.parse(raw));
    } catch {
      target = null;
    }
    if (target) {
      const { data: row } = await supabase
        .from("targets")
        .insert({ ...target, voice_id: VOICE_IDS.includes(target.voice_id) ? target.voice_id : null, org_id: membership.org_id, created_by: user.id, kind: "practice" })
        .select("id")
        .single();
      if (row) redirect(`/practice?target=${row.id}&difficulty=warm`);
    }
  }
  redirect("/dashboard?welcome=1");
}
