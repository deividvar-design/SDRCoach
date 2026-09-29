import Link from "next/link";
import { Target as TargetIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { voiceById } from "@/lib/domain/voices";
import { Button } from "@/components/ui/button";
import { TargetDialog } from "./target-dialog";

export const metadata = { title: "Targets" };

export default async function TargetsPage({ searchParams }: PageProps<"/targets">) {
  const { kind } = await searchParams;
  const filter = kind === "practice" ? "practice" : kind === "real" ? "real" : "all";
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("targets")
    .select("*")
    .eq("org_id", viewer.org.id)
    .eq("is_archived", false)
    .order("kind", { ascending: false })
    .order("created_at", { ascending: false });

  const targets = (all ?? []).filter((t) => filter === "all" || t.kind === filter);
  const counts = { all: all?.length ?? 0, real: all?.filter((t) => t.kind === "real").length ?? 0, practice: all?.filter((t) => t.kind === "practice").length ?? 0 };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Who you're calling"
        title="Targets"
        description="Real accounts your team is working, plus practice personas to warm up on. Each one becomes a live AI prospect."
        actions={<TargetDialog />}
      />

      <div className="flex gap-1 border-b">
        {(["all", "real", "practice"] as const).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/targets" : `/targets?kind=${k}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm capitalize transition-colors",
              filter === k ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {k} <span className="text-muted-foreground ml-1 font-mono text-xs">{counts[k]}</span>
          </Link>
        ))}
      </div>

      {!targets.length ? (
        <EmptyState
          icon={TargetIcon}
          title={filter === "real" ? "No real targets yet" : "No targets yet"}
          description="Add the accounts and people your reps are actually calling this quarter. The AI will play them."
          action={<TargetDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((t) => (
            <div key={t.id} className="bg-card group flex flex-col gap-3 rounded-2xl border p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/targets/${t.id}`} className="font-display text-xl hover:underline underline-offset-4">{t.name}</Link>
                  <div className="text-muted-foreground text-sm">
                    {t.title} · {t.company}
                  </div>
                </div>
                <Badge variant={t.kind === "practice" ? "outline" : "secondary"}>{t.kind}</Badge>
                {voiceById(t.voice_id) && <span className="text-muted-foreground text-xs">{voiceById(t.voice_id)!.name}</span>}
              </div>
              {t.persona_notes && <p className="text-muted-foreground line-clamp-3 text-sm">{t.persona_notes}</p>}
              <div className="text-muted-foreground mt-auto flex gap-3 pt-2 font-mono text-[11px] uppercase">
                <span>{t.pain_points.length} pains</span>
                <span>{t.objections.length} objections</span>
                {t.industry && <span>{t.industry}</span>}
              </div>
              <Button size="sm" asChild>
                <Link href={`/practice?target=${t.id}`}>Call {t.name.split(" ")[0]}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
