import "server-only";
import { randomBytes } from "node:crypto";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_LINK_DAYS } from "@/lib/access/links";
import { DRAFT_MODEL, SiteError, draftWorkspace, fetchSiteText } from "@/lib/onboarding/draft";
import { recordAnthropicUsage } from "@/lib/usage/record";
import { reportError } from "@/lib/sentry";

export interface IssueInput {
  email: string;
  company: string;
  calls: number;
  days: number;
  note: string | null;
  /** Already normalised; the workspace context is drafted from it before the link is handed out. */
  site: URL | null;
  createdBy: string;
}

export type IssueResult = { ok: true; id: string; token: string; draftNote: string } | { error: string };

/**
 * Creates an access link and, when a website is given, reads it and drafts the workspace context so the recipient
 * lands ready to dial. A failed draft never loses the link: it is noted on the row and they get the context step.
 */
export async function issueAccessLink(p: IssueInput): Promise<IssueResult> {
  const db = createAdminClient();
  const { data: open } = await db.from("access_links").select("id").eq("email", p.email).is("claimed_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
  if (open) return { error: "An open link for this address already exists. Revoke it first to issue another." };
  const { data: row, error } = await db
    .from("access_links")
    .insert({ token: randomBytes(24).toString("hex"), email: p.email, company: p.company, calls: p.calls, days: p.days, note: p.note, website: p.site?.href ?? null, created_by: p.createdBy, expires_at: new Date(Date.now() + ACCESS_LINK_DAYS * 86_400_000).toISOString() })
    .select("id, token")
    .single();
  if (error || !row) return { error: error?.message ?? "Could not create the link." };

  let draftNote = "";
  if (p.site) {
    try {
      const text = await fetchSiteText(p.site);
      const { usage, ...draft } = await draftWorkspace({ orgName: p.company, site: p.site.href, text });
      await recordAnthropicUsage(db, { kind: "digest", model: DRAFT_MODEL, usage });
      await db.from("access_links").update({ draft: draft as unknown as Json, draft_error: null }).eq("id", row.id);
      draftNote = ` Context and a first buyer drafted from ${p.site.hostname}.`;
    } catch (err) {
      const reason = err instanceof SiteError ? err.message : "the draft did not come through";
      if (!(err instanceof SiteError)) reportError(err, { where: "access_link_draft", extra: { link: row.id, site: p.site.href } });
      await db.from("access_links").update({ draft_error: reason }).eq("id", row.id);
      draftNote = ` Could not draft from ${p.site.hostname} (${reason}); they will get the context step instead.`;
    }
  }
  return { ok: true, id: row.id, token: row.token, draftNote };
}
