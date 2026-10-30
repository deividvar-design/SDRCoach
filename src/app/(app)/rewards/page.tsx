import Link from "next/link";
import { Gift, Share2, Users, UserPlus } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAllowance } from "@/lib/billing/allowance";
import { INVITE_REWARD_CAP, REFERRAL_ACTIVATION_CALLS, REFERRED_DISCOUNT, REWARDS, rewardLine, type RewardKind } from "@/lib/rewards/config";
import { referralLink } from "@/lib/rewards/referral";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyLink } from "../team/copy-link";
import { ClaimForm } from "./claim-form";
import type { RewardClaim } from "@/types/database";

export const metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

const ICON: Record<RewardKind, React.ComponentType<{ className?: string }>> = { linkedin_post: LinkedInMark, x_post: XMark, scorecard_share: Share2, invite_rep: UserPlus, referral_trial: Users, referral_paid: Gift };
const PLACEHOLDER: Partial<Record<RewardKind, string>> = { linkedin_post: "https://www.linkedin.com/posts/…", x_post: "https://x.com/…/status/…", scorecard_share: "Link to the post" };

function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M20.4 2H3.6A1.6 1.6 0 0 0 2 3.6v16.8A1.6 1.6 0 0 0 3.6 22h16.8a1.6 1.6 0 0 0 1.6-1.6V3.6A1.6 1.6 0 0 0 20.4 2ZM8 19H5V9.5h3V19ZM6.5 8.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3V9.5h2.9v1.3h.1a3.1 3.1 0 0 1 2.8-1.6c3 0 3.5 2 3.5 4.6V19Z" />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.2 2h3.4l-7.4 8.5L22.9 22h-6.8l-5.3-6.9L4.7 22H1.3l7.9-9.1L.8 2h7l4.8 6.3L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z" />
    </svg>
  );
}

export default async function RewardsPage() {
  const viewer = await requireViewer();
  const db = createAdminClient();
  const [allowance, { data: claims }, { data: referred }] = await Promise.all([
    loadAllowance(viewer.org, { userId: viewer.userId, isManager: viewer.membership.role !== "rep" }),
    db.from("reward_claims").select("*").eq("org_id", viewer.org.id).order("created_at", { ascending: false }),
    db.from("organizations").select("id, name, plan, created_at").eq("referred_by_org_id", viewer.org.id).order("created_at", { ascending: false }),
  ]);
  const all = (claims ?? []) as RewardClaim[];
  const byKind = (kind: RewardKind) => all.filter((c) => c.kind === kind);
  const earned = all.filter((c) => c.status === "approved").reduce((n, c) => n + c.calls, 0);
  const invitesRewarded = byKind("invite_rep").filter((c) => c.status === "approved").length;
  const onTrial = viewer.org.plan === "trial";
  const link = viewer.org.referral_code ? referralLink(viewer.org.referral_code) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Rewards"
        title="Earn more calls."
        description="Tell people about 100 Dials, bring your reps in, refer another team. Calls land in your workspace pool."
        actions={
          allowance ? (
            <div className="text-right text-sm">
              <div className="font-medium tabular">{allowance.left} call{allowance.left === 1 ? "" : "s"} left</div>
              <div className="text-muted-foreground text-xs">{earned > 0 ? `${earned} earned so far` : onTrial ? "on your trial" : "this month"}</div>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {REWARDS.map((r) => {
          const Icon = ICON[r.kind];
          const mine = byKind(r.kind);
          const latest = mine[0];
          const rewardText = rewardLine(r.calls, onTrial ? r.trialDays : 0);
          return (
            <section key={r.kind} className="bg-card flex flex-col gap-4 rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-muted grid size-10 shrink-0 place-items-center rounded-full"><Icon className="size-5" /></span>
                  <div>
                    <h2 className="font-medium">{r.title}</h2>
                    <p className="text-muted-foreground text-sm">{r.blurb}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 whitespace-nowrap">+{r.kind === "invite_rep" ? `${r.calls} per rep` : rewardText}</Badge>
              </div>
              <ol className="text-muted-foreground space-y-1 text-sm">
                {r.steps.map((s, i) => <li key={s}><span className="text-foreground mr-2 tabular">{i + 1}.</span>{s}</li>)}
              </ol>
              <div className="mt-auto">
                {r.kind === "invite_rep" ? (
                  <div className="space-y-2">
                    <p className="text-sm">{invitesRewarded} of {INVITE_REWARD_CAP} rewarded{invitesRewarded > 0 ? `: ${byKind("invite_rep").filter((c) => c.status === "approved").map((c) => c.note).filter(Boolean).join(", ")}` : ""}</p>
                    {viewer.membership.role !== "rep" ? (
                      <Button className="w-full" asChild><Link href="/team">Invite a rep</Link></Button>
                    ) : (
                      <p className="text-muted-foreground text-sm">Ask a manager to invite them from the Team page.</p>
                    )}
                  </div>
                ) : r.kind === "referral_trial" ? (
                  <div className="space-y-2">
                    {link ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 text-xs">{link}</code>
                        <CopyLink link={link} label="Copy" />
                      </div>
                    ) : null}
                    {referred && referred.length > 0 ? (
                      <ul className="text-muted-foreground space-y-1 text-sm">
                        {referred.map((o) => {
                          const trial = byKind("referral_trial").find((c) => c.ref_org_id === o.id);
                          const paid = byKind("referral_paid").find((c) => c.ref_org_id === o.id);
                          return <li key={o.id}>{o.name}: {paid ? "subscribed, month earned" : trial ? `${r.calls} calls earned` : `signed up, ${REFERRAL_ACTIVATION_CALLS} calls to go`}</li>;
                        })}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">They get {REFERRED_DISCOUNT.percent}% off their first {REFERRED_DISCOUNT.months} months. <Link href="/refer" className="underline underline-offset-4">How it works</Link></p>
                    )}
                  </div>
                ) : latest && latest.status !== "rejected" ? (
                  <p className="text-sm">
                    {latest.status === "approved" ? <><Badge variant="success">Added</Badge> <span className="text-muted-foreground">{rewardLine(latest.calls, latest.days)} on {formatDate(latest.decided_at ?? latest.created_at)}</span></> : <><Badge variant="secondary">Waiting for approval</Badge> <span className="text-muted-foreground">sent {formatDate(latest.created_at)}</span></>}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {latest?.status === "rejected" && <p className="text-destructive text-sm">Last claim was not accepted{latest.note ? `: ${latest.note}` : ""}. You can try again.</p>}
                    <ClaimForm kind={r.kind} cta={r.cta} placeholder={PLACEHOLDER[r.kind] ?? "Link to the post"} />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-muted-foreground text-sm">
        Posts are checked by a person, usually within a working day. Calls earned on a trial are added to the trial; on a paid plan they are spent after the month's included calls. Full terms on the <Link href="/refer" className="underline underline-offset-4">referral page</Link>.
      </p>
    </div>
  );
}
