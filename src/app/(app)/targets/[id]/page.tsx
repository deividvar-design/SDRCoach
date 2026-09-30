import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVELS } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/score-pill";
import { TargetEditForm } from "./target-form";
import { ArchiveButton } from "../archive-button";
import { archiveTargetAndReturn } from "../actions";

export const metadata = { title: "Target" };

export default async function TargetPage({ params }: PageProps<"/targets/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: target }, { data: calls }] = await Promise.all([
    supabase.from("targets").select("*").eq("id", id).eq("org_id", viewer.org.id).maybeSingle(),
    supabase.from("call_sessions").select("id, created_at, difficulty, outcome, user_id, profiles(full_name), call_scores(overall)").eq("target_id", id).eq("org_id", viewer.org.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const isManager = canManage(viewer.membership.role);
  if (!target || (target.is_archived && !isManager)) notFound();
  const canEdit = isManager || target.created_by === viewer.userId;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild><Link href="/targets"><ArrowLeft /> Targets</Link></Button>
      <PageHeader
        eyebrow={`${target.kind === "practice" ? "Practice persona" : "Real account"}${target.is_archived ? ", archived" : ""}`}
        title={target.name}
        description={`${target.title}, ${target.company}${target.industry ? `, ${target.industry}` : ""}`}
        actions={
          target.is_archived ? (
            isManager ? <ArchiveButton id={target.id} name={target.name} archived variant="text" /> : undefined
          ) : (
            <Button variant="signal" asChild>
              <Link href={`/practice?target=${target.id}`}><Phone /> Call {target.name.split(" ")[0]}</Link>
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="mb-5 font-medium">{canEdit ? "Edit persona" : "Persona"}</h2>
          {canEdit ? (
            <TargetEditForm target={target} />
          ) : (
            <div className="space-y-4 text-sm">
              <p>{target.persona_notes}</p>
              <div><div className="text-muted-foreground mb-1 text-xs">Pain points</div><ul className="list-disc pl-5">{target.pain_points.map((p) => <li key={p}>{p}</li>)}</ul></div>
              <div><div className="text-muted-foreground mb-1 text-xs">Objections</div><ul className="list-disc pl-5">{target.objections.map((p) => <li key={p}>{p}</li>)}</ul></div>
            </div>
          )}
          {isManager && !target.is_archived && (
            <form action={archiveTargetAndReturn.bind(null, target.id)} className="mt-8 border-t pt-5">
              <p className="text-muted-foreground mb-2 text-xs">Archiving hides the target from reps and stops new calls against it. Past calls keep their history. You can restore it any time from the Archived tab.</p>
              <Button type="submit" variant="outline" size="sm">Archive target</Button>
            </form>
          )}
        </section>

        <section className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4"><h2 className="font-medium">Calls against {target.name.split(" ")[0]}</h2></div>
          {!calls?.length ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">No calls yet.</p>
          ) : (
            <ul className="divide-y">
              {calls.map((c) => (
                <li key={c.id}>
                  <Link href={`/sessions/${c.id}`} className="hover:bg-accent/40 flex items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{c.profiles?.full_name ?? "Rep"}</div>
                      <div className="text-muted-foreground text-xs">{formatDate(c.created_at)}, L{LEVELS[c.difficulty].level}</div>
                    </div>
                    {c.outcome === "meeting_booked" && <Badge variant="success">Booked</Badge>}
                    <ScorePill value={c.call_scores?.overall ?? null} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
