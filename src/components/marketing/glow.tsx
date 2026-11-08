import { Rays } from "@/components/shell/brand-panel";
import { cn } from "@/lib/utils";

/**
 * The top of a marketing page, in the homepage's look: a navy band under the navy header, with light rays rising
 * from the bottom edge. Text inside reads light (see .brand-panel in globals.css); white cards stay white.
 */
export function Glow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("brand-panel pb-8 md:pb-12", className)}>
      <Rays className="left-0 opacity-80" height={240} />
      {children}
    </div>
  );
}
