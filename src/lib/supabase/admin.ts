import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS. Use only in trusted server code
 * (webhooks, background scoring) and never pass its output to the client unfiltered.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (process.env.SDRCOACH_DEMO === "1" && !process.env.VERCEL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createDemoClient } = require("@/lib/demo/client") as typeof import("@/lib/demo/client");
    return createDemoClient() as unknown as SupabaseClient<Database>;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
