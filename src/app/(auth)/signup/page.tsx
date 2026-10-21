import { AuthForm, type PlanIntent } from "../auth-form";
import { PLANS, type BillingInterval } from "@/lib/billing/plans";

const BILLING: BillingInterval[] = ["month", "quarter", "year"];

/** `?plan=team&billing=year` from the pricing page is shown back and remembered; anything else is ignored. */
function planIntent(plan: unknown, billing: unknown): PlanIntent | undefined {
  const p = PLANS.find((x) => x.id === plan && x.id !== "enterprise");
  if (!p) return undefined;
  const b = BILLING.includes(billing as BillingInterval) ? (billing as BillingInterval) : "month";
  return { plan: p.id, planName: p.name, billing: b };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { invite, email, plan, billing } = await searchParams;
  return <AuthForm mode="signup" invite={typeof invite === "string" ? invite : undefined} email={typeof email === "string" ? email : undefined} intent={planIntent(plan, billing)} />;
}
