"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The rep has read the recording notice. Recorded once on the profile; the practice screens gate on it. */
export async function acknowledgeRecording() {
  const viewer = await requireViewer();
  if (viewer.profile.recording_ack_at) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ recording_ack_at: new Date().toISOString() }).eq("id", viewer.userId);
  revalidatePath("/practice");
}
