import { AuthForm, type PlanIntent } from "../auth-form";
import { PLANS, type BillingInterval } from "@/lib/billing/plans";

export const metadata = { title: "Start your free trial" };

const BILLING: BillingInterval[] = ["month", "quarter", "year"];

/** `?plan=team&billing=year` from the pricing page is shown back and remembered; anything else is ignored. */
function planIntent(plan: unknown, billing: unknown): PlanIntent | undefined {
  const p = PLANS.find((x) => x.id === plan && x.id !== "enterprise");
  if (!p) return undefined;
  const alias: Record<string, BillingInterval> = { annual: "year", annually: "year", yearly: "year", monthly: "month", quarterly: "quarter" };
  const raw = typeof billing === "string" ? (alias[billing] ?? billing) : "month";
  const b = BILLING.includes(raw as BillingInterval) ? (raw as BillingInterval) : "month";
  return { plan: p.id, planName: p.name, billing: b };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { invite, email, plan, billing } = await searchParams;
  return <AuthForm mode="signup" invite={typeof invite === "string" ? invite : undefined} email={typeof email === "string" ? email : undefined} intent={planIntent(plan, billing)} />;
}
