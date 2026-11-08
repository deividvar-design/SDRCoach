import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { markSeen } from "@/lib/admin/badges";
import { createAdminClient } from "@/lib/supabase/admin";
import { AMBIENCE_KINDS, AMBIENCE_LABEL, AMBIENCE_PROMPTS, ambienceUrl } from "@/lib/audio/ambience-library";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { GenerateButton } from "./generate-button";

export const metadata = { title: "Background sounds" };
export const dynamic = "force-dynamic";
// Each generation waits on ElevenLabs for a 30-second clip.
export const maxDuration = 120;

/** One recorded loop per place. Calls play the recording when it exists and fall back to the generated bed when not. */
export default async function AdminSoundsPage() {
  const admin = await requireAdmin();
  const db = createAdminClient();
  await markSeen(db, admin.email, "sounds");
  const { data: files } = await db.storage.from("ambience").list("", { limit: 100 });
  const byName = new Map((files ?? []).map((f) => [f.name, f]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Background sounds"
        description="The background each call plays, by where the prospect is. Generate a recording with ElevenLabs, listen, and regenerate until it sounds right. Places without one use the built-in generated sound."
        actions={<Link href="/admin" className="text-sm underline underline-offset-4">Back to admin</Link>}
      />
      <ul className="bg-card divide-y overflow-hidden rounded-[18px] border">
        {AMBIENCE_KINDS.map((kind) => {
          const file = byName.get(`${kind}.mp3`);
          const version = file?.updated_at ? new Date(file.updated_at).getTime() : 0;
          return (
            <li key={kind} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="text-[17px] font-semibold">{AMBIENCE_LABEL[kind]}</h2>
                  <span className="text-muted-foreground text-[13px]">{file ? `Recording from ${formatDate(file.updated_at ?? file.created_at ?? "")}` : "No recording yet: calls use the generated sound"}</span>
                </div>
                <p className="text-muted-foreground text-[13px]">{AMBIENCE_PROMPTS[kind]}</p>
                {/* The version query skips the five-minute CDN cache so you hear the clip you just made. */}
                {file && <audio controls preload="none" src={`${ambienceUrl(kind)}?v=${version}`} className="h-9 w-full max-w-md" />}
              </div>
              <GenerateButton kind={kind} exists={Boolean(file)} />
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-[13px]">On a call the recording loops from a random point and is set to the same quiet level as the generated sound, well under the prospect&apos;s voice.</p>
    </div>
  );
}
