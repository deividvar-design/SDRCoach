"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const base = slugify(parsed.data.name) || "team";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.rpc("create_organization", { p_name: parsed.data.name, p_slug: slug });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
