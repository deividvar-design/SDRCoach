import { BookOpen } from "lucide-react";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScorePoller } from "@/components/report/score-poller";
import { KnowledgeForm } from "./knowledge-form";
import { deleteKnowledge, retryDigest } from "./actions";

export const metadata = { title: "Knowledge" };

const KIND_LABEL = { call_transcript: "Transcripts", script: "Script", playbook: "Playbook", objection_sheet: "Objections" } as const;
const STATUS_VARIANT = { pending: "secondary", processing: "warning", ready: "success", failed: "destructive" } as const;
const STATUS_LABEL = { pending: "Queued", processing: "Reading…", ready: "Ready", failed: "Failed" } as const;

export default async function KnowledgePage() {
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("knowledge_sources")
    .select("id, name, kind, status, summary, error, created_at")
    .eq("org_id", viewer.org.id)
    .order("created_at", { ascending: false });

  const busy = (sources ?? []).some((s) => s.status === "pending" || s.status === "processing");

  return (
    <div className="space-y-8">
      <ScorePoller active={busy} />
      <PageHeader
        eyebrow="Grounding"
        title="Knowledge"
        description="Your real call recordings, scripts and playbooks. Prospects learn to talk like your market; the coach learns what your team rewards."
      />

      <section className="bg-card rounded-2xl border p-6">
        <KnowledgeForm />
      </section>

      {!sources?.length ? (
        <EmptyState icon={BookOpen} title="Nothing here yet" description="Upload a CSV of real cold calls to start. Even five calls make the prospects noticeably more like your market." />
      ) : (
        <ul className="bg-card divide-y rounded-2xl border">
          {sources.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{s.name}</span>
                  <Badge variant="outline">{KIND_LABEL[s.kind]}</Badge>
                  <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </div>
                <div className="text-muted-foreground text-xs">Added {formatDate(s.created_at)}</div>
                {s.summary && <p className="text-muted-foreground text-sm">{s.summary}</p>}
                {s.status === "failed" && s.error && <p className="text-destructive text-xs">{s.error}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {s.status === "failed" && (
                  <form action={retryDigest.bind(null, s.id)}>
                    <Button size="sm" variant="outline" type="submit">Retry</Button>
                  </form>
                )}
                <form action={deleteKnowledge.bind(null, s.id)}>
                  <Button size="sm" variant="ghost" type="submit">Remove</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
