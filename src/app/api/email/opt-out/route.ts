import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";

/** One click from a manager introduction: that address gets no more of them, from anyone. The id is the only credential needed. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (/^[0-9a-f-]{36}$/.test(id)) {
    await createAdminClient().from("manager_intros").update({ opted_out_at: new Date().toISOString() }).eq("id", id);
  }
  return NextResponse.redirect(`${SITE.url}/email/opted-out`);
}
