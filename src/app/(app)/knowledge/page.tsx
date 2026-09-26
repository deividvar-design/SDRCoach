import { BookOpen } from "lucide-react";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KnowledgeForm } from "./knowledge-form";
import { deleteKnowledge } from "./actions";

export const metadata = { title: "Knowledge" };

const KIND_LABEL = { call_transcript: "Transcript", script: "Script", playbook: "Playbook", objection_sheet: "Objections" } as const;
const STATUS_VARIANT = { pending: "secondary", processing: "warning", ready: "success", failed: "destructive" } as const;

export default async function KnowledgePage() {
  const viewer = await requireManager();
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("knowledge_sources")
    .select("id, name, kind, status, summary, created_at")
    .eq("org_id", viewer.org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge"
        description="Real call transcripts, scripts and playbooks. The coach uses them to make prospects sound like your market and to grade against your playbook."
      />

      <section className="bg-card rounded-xl border p-6">
        <h2 className="mb-4 font-medium">Add a source</h2>
        <KnowledgeForm />
      </section>

      {!sources?.length ? (
        <EmptyState icon={BookOpen} title="Nothing here yet" description="Paste a few real cold-call transcripts to start. Even five calls make a noticeable difference." />
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {sources.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{s.name}</span>
                  <Badge variant="outline">{KIND_LABEL[s.kind]}</Badge>
                  <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                </div>
                <div className="text-muted-foreground text-xs">Added {formatDate(s.created_at)}</div>
                {s.summary && <p className="text-muted-foreground line-clamp-2 text-sm">{s.summary}</p>}
              </div>
              <form action={deleteKnowledge.bind(null, s.id)}>
                <Button size="sm" variant="ghost" type="submit">Remove</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
