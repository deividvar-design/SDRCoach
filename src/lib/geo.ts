import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportError } from "@/lib/sentry";

/** The visitor's country as Vercel reads it from the IP: a code like "LT", or null off Vercel or when unknown. */
export async function requestCountry(): Promise<string | null> {
  const code = (await headers()).get("x-vercel-ip-country")?.trim().toUpperCase() ?? null;
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** Notes the country a new workspace was created from. Admin-only; a failure never blocks the signup. */
export async function recordWorkspaceCountry(orgId: string) {
  const country = await requestCountry();
  if (!country) return;
  const { error } = await createAdminClient().from("workspace_countries").upsert({ org_id: orgId, country });
  if (error) reportError(new Error(error.message), { where: "workspace_country", orgId });
}

/** All recorded workspace countries, by workspace id. Small table, read whole. */
export async function workspaceCountries(): Promise<Map<string, string>> {
  const { data } = await createAdminClient().from("workspace_countries").select("org_id, country");
  return new Map((data ?? []).map((r) => [r.org_id, r.country]));
}

const NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/** "LT" to "Lithuania", falling back to the code itself. */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}
