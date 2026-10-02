import { ShieldCheck } from "lucide-react";
import { SALES_EMAIL } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/** The money-back guarantee as its own band, so it is read rather than buried in small print. */
export function Guarantee({ className }: { className?: string }) {
  return (
    <div className={cn("border-signal/40 bg-signal/5 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:gap-6 md:p-7", className)}>
      <div className="bg-signal text-signal-foreground grid size-12 shrink-0 place-items-center rounded-full">
        <ShieldCheck className="size-6" />
      </div>
      <div>
        <p className="font-display text-2xl leading-tight md:text-3xl">30-day money-back guarantee on your first payment.</p>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Not working for the team? Email <a href={`mailto:${SALES_EMAIL}`} className="text-foreground underline underline-offset-4">{SALES_EMAIL}</a> within 30 days of your first payment and we refund it in full. No questions.
        </p>
      </div>
    </div>
  );
}
