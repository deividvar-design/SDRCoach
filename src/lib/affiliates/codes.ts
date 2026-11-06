import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** Eight lowercase characters, like workspace referral codes, and unused by either table. */
export async function newAffiliateCode(db = createAdminClient()) {
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    if (code.length < 8) continue;
    const [{ data: org }, { data: aff }] = await Promise.all([
      db.from("organizations").select("id").eq("referral_code", code).maybeSingle(),
      db.from("affiliates").select("id").eq("code", code).maybeSingle(),
    ]);
    if (!org && !aff) return code;
  }
  throw new Error("could not find a free affiliate code");
}
