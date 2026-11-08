import { Aurora } from "@/components/marketing/aurora";
import { cn } from "@/lib/utils";

/**
 * The top of a marketing page, in the homepage's look: the navy band under the navy header with the same light
 * columns as the homepage hero. Text inside reads light (see .brand-panel in globals.css); white cards stay white.
 */
export function Glow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("brand-panel pb-8 md:pb-12", className)} style={{ background: "var(--hp-navy)" }}>
      <Aurora className="[mask-image:linear-gradient(to_bottom,black,black_55%,transparent_95%)]" />
      {children}
    </div>
  );
}
