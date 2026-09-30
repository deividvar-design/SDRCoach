import Link from "next/link";
import { Target as TargetIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TargetDialog } from "./target-dialog";
import { ArchiveButton } from "./archive-button";

export const metadata = { title: "Targets" };

export default async function TargetsPage({ searchParams }: PageProps<"/targets">) {
  const { kind } = await searchParams;
  const viewer = await requireViewer();
  const isManager = canManage(viewer.membership.role);
  // Archived targets exist only for managers. A rep asking for them gets the normal list.
  const filter = kind === "practice" ? "practice" : kind === "real" ? "real" : kind === "archived" && isManager ? "archived" : "all";
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("targets")
    .select("*")
    .eq("org_id", viewer.org.id)
    .order("kind", { ascending: false })
    .order("created_at", { ascending: false });

  const live = (rows ?? []).filter((t) => !t.is_archived);
  const archived = (rows ?? []).filter((t) => t.is_archived);
  const targets = filter === "archived" ? archived : live.filter((t) => filter === "all" || t.kind === filter);
  const counts = { all: live.length, real: live.filter((t) => t.kind === "real").length, practice: live.filter((t) => t.kind === "practice").length, archived: archived.length };
  const tabs = isManager && archived.length > 0 ? (["all", "real", "practice", "archived"] as const) : (["all", "real", "practice"] as const);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Who you're calling"
        title="Targets"
        description="Real accounts your team is working, plus practice personas to warm up on. Each one becomes a live AI prospect."
        actions={isManager ? <TargetDialog /> : undefined}
      />

      <div className="flex gap-1 border-b">
        {tabs.map((k) => (
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
          title={filter === "archived" ? "Nothing archived" : filter === "real" ? "No real targets yet" : "No targets yet"}
          description="Add the accounts and people your reps are actually calling this quarter. The AI will play them."
          action={isManager ? <TargetDialog /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((t) => (
            <div key={t.id} className={cn("bg-card group flex flex-col gap-3 rounded-2xl border p-5 transition-shadow hover:shadow-md", t.is_archived && "opacity-70")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/targets/${t.id}`} className="font-display text-xl hover:underline underline-offset-4">{t.name}</Link>
                  <div className="text-muted-foreground text-sm">
                    {t.title}, {t.company}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={t.kind === "practice" ? "outline" : "secondary"}>{t.kind === "practice" ? "Practice" : "Real"}</Badge>
                  {isManager && !t.is_archived && <ArchiveButton id={t.id} name={t.name} archived={false} />}
                </div>
              </div>
              {t.persona_notes && <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{t.persona_notes}</p>}
              <div className="text-muted-foreground mt-auto pt-2 text-xs">
                {[`${t.pain_points.length} ${t.pain_points.length === 1 ? "pain point" : "pain points"}`, `${t.objections.length} ${t.objections.length === 1 ? "objection" : "objections"}`, t.industry].filter(Boolean).join(", ")}
              </div>
              {t.is_archived ? (
                <ArchiveButton id={t.id} name={t.name} archived variant="text" />
              ) : (
                <Button size="sm" asChild>
                  <Link href={`/practice?target=${t.id}`}>Call {t.name.split(" ")[0]}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
