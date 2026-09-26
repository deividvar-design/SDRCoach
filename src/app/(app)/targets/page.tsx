import Link from "next/link";
import { Target as TargetIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TargetDialog } from "./target-dialog";

export const metadata = { title: "Targets" };

export default async function TargetsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: targets } = await supabase
    .from("targets")
    .select("*")
    .eq("org_id", viewer.org.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Targets"
        description="The prospects your team practises against. Each one becomes an AI persona."
        actions={<TargetDialog />}
      />

      {!targets?.length ? (
        <EmptyState
          icon={TargetIcon}
          title="No targets yet"
          description="Add the accounts and personas your reps are actually calling this quarter."
          action={<TargetDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((t) => (
            <div key={t.id} className="bg-card flex flex-col gap-3 rounded-xl border p-5">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground text-sm">
                  {t.title} · {t.company}
                </div>
              </div>
              {t.industry && <Badge variant="secondary">{t.industry}</Badge>}
              {t.persona_notes && <p className="text-muted-foreground line-clamp-3 text-sm">{t.persona_notes}</p>}
              <div className="text-muted-foreground mt-auto flex gap-3 pt-2 text-xs">
                <span>{t.pain_points.length} pain points</span>
                <span>{t.objections.length} objections</span>
              </div>
              <Button size="sm" asChild>
                <Link href={`/practice?target=${t.id}`}>Practise this call</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
