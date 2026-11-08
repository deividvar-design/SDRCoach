import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DemoCall } from "@/types/database";

export const DEMO_COOKIE = "boss_demo";

/** The key the cookie is signed with. Never the public anon key; a deployment without a server key refuses to sign. */
function cookieKey() {
  const key = process.env.DEMO_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key) return key;
  if (process.env.VERCEL) throw new Error("No key to sign the Karen cookie with");
  return "local-demo-only";
}

const sign = (id: string) => createHmac("sha256", cookieKey()).update(`boss_demo:${id}`).digest("base64url");

/**
 * The cookie value for a demo: its id and a signature. The id alone also appears in the scorecard email's unsubscribe
 * link, so it must not be enough to act as the caller.
 */
export function demoCookieValue(id: string) {
  return `${id}.${sign(id)}`;
}

/** The demo id a cookie vouches for, or null when it is missing, malformed or not signed by us. */
export function demoIdFromCookie(value: string | undefined | null): string | null {
  const [id, sig] = (value ?? "").split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

/** The demo this browser started, from its cookie. Null when there is none or it has expired. */
export async function currentDemo(): Promise<DemoCall | null> {
  const id = demoIdFromCookie((await cookies()).get(DEMO_COOKIE)?.value);
  if (!id) return null;
  const { data } = await createAdminClient().from("demo_calls").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}
