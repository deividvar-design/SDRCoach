import Link from "next/link";
import { Target as TargetIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { canManage } from "@/lib/domain/roles";
import { LEVEL_LIST } from "@/lib/domain/levels";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { PracticeSetup } from "./practice-setup";

export const metadata = { title: "Start a call" };

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const { target, assignment, difficulty } = await searchParams;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const [{ data: targets }, { data: assignmentRow }] = await Promise.all([
    supabase.from("targets").select("id, name, title, company, industry").eq("org_id", viewer.org.id).eq("is_archived", false).order("name"),
    typeof assignment === "string"
      ? supabase.from("assignments").select("id, target_id, difficulty").eq("id", assignment).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!targets?.length) {
    return (
      <div className="space-y-8">
        <PageHeader title="Start a call" />
        <EmptyState icon={TargetIcon} title="Add a target first" description="A call needs someone on the other end. Create a target persona and come back." action={<Button asChild><Link href="/targets">Go to targets</Link></Button>} />
      </div>
    );
  }

  const noContext = !viewer.org.product_description && !viewer.org.company_description;
  const isManager = canManage(viewer.membership.role);

  return (
    <div className="space-y-8">
      <PageHeader title="Start a call" description="Pick who you're calling and how hard they'll make it." />
      {noContext && (
        <div className="border-signal/40 bg-card flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">The prospect doesn't know what you sell yet</div>
            <p className="text-muted-foreground text-sm">
              Without company context the prospect reacts only to what you say on the call, and the coach can't judge whether your pitch fit.
              {isManager ? " Two minutes in Settings fixes both." : " Ask your manager to fill in the company context in Settings."}
            </p>
          </div>
          {isManager && (
            <Button variant="outline" asChild>
              <Link href="/settings#company">Add company context</Link>
            </Button>
          )}
        </div>
      )}
      <PracticeSetup
        targets={targets}
        levels={LEVEL_LIST}
        initialTargetId={assignmentRow?.target_id ?? (typeof target === "string" ? target : targets[0]!.id)}
        initialDifficulty={assignmentRow?.difficulty ?? (difficulty === "inbound" || difficulty === "cold" ? difficulty : "warm")}
        assignmentId={assignmentRow?.id ?? null}
      />
    </div>
  );
}
