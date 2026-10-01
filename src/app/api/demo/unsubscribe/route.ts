import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";

/** One click from either demo email: no follow-up, no newsletter. The id is an unguessable uuid, which is the only credential needed. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (/^[0-9a-f-]{36}$/.test(id)) {
    await createAdminClient().from("demo_calls").update({ followup_sent_at: new Date().toISOString(), newsletter: false }).eq("id", id);
  }
  return NextResponse.redirect(`${SITE.url}/karen?unsubscribed=1`);
}
