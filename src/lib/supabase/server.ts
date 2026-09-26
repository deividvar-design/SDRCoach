import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/** Request-scoped Supabase client that runs as the signed-in user (RLS applies). */
export async function createClient(): Promise<SupabaseClient<Database>> {
  if (process.env.SDRCOACH_DEMO === "1") {
    if (process.env.VERCEL) throw new Error("SDRCOACH_DEMO must never be set on a deployed environment");
    const { createDemoClient } = await import("@/lib/demo/client");
    return createDemoClient() as unknown as SupabaseClient<Database>;
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component: cookies are refreshed by proxy.ts instead.
          }
        },
      },
    },
  );
}
