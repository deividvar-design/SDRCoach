import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logFunnel } from "@/lib/funnel";
import { SITE } from "@/lib/site";

/** The button in a manager introduction: notes the first open, then shows the managers page. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (/^[0-9a-f-]{36}$/.test(id)) {
    const db = createAdminClient();
    const { data } = await db.from("manager_intros").update({ opened_at: new Date().toISOString() }).eq("id", id).is("opened_at", null).select("org_id").maybeSingle();
    if (data) await logFunnel("manager_intro_opened", { subject: data.org_id, dedupeKey: `manager_intro_opened:${id}`, meta: { intro: id } });
  }
  return NextResponse.redirect(`${SITE.url}/for-managers?from=intro`, { status: 307 });
}
