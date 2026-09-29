"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InviteAcceptState = { error?: "mismatch" | "seats" | "invalid" };

export async function acceptInvite(token: string, _prev: InviteAcceptState): Promise<InviteAcceptState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    if (error.message.includes("invite_email_mismatch")) return { error: "mismatch" };
    if (error.message.includes("no_seats_left")) return { error: "seats" };
    return { error: "invalid" };
  }
  redirect("/dashboard");
}
