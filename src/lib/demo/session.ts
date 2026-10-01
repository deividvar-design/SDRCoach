import "server-only";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DemoCall } from "@/types/database";

export const DEMO_COOKIE = "boss_demo";

/** The demo this browser started, from its cookie. Null when there is none or it has expired. */
export async function currentDemo(): Promise<DemoCall | null> {
  const id = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createAdminClient().from("demo_calls").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}
