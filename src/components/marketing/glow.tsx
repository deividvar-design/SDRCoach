import { cn } from "@/lib/utils";

/**
 * The sign-in screen's backdrop, for the top of a marketing page: two soft lights, one signal orange and one ink,
 * under a film of grain. It sits behind the content, spans the full width, and fades out toward the bottom so it
 * never ends in a hard edge against the next section.
 */
export function Glow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative isolate", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
        <div className="bg-signal/10 absolute -top-32 -left-24 size-[360px] rounded-full blur-3xl md:size-[460px]" />
        <div className="bg-primary/12 absolute top-1/4 -right-40 size-[420px] rounded-full blur-3xl md:size-[560px]" />
        {/* .grain sets position: relative, so it gets its own full-size box rather than sharing the absolute layer. */}
        <div className="grain size-full" />
      </div>
      {children}
    </div>
  );
}
