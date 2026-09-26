import { cn } from "@/lib/utils";

export function PageHeader({ title, eyebrow, description, actions, className }: { title: React.ReactNode; eyebrow?: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow && <div className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">{eyebrow}</div>}
        <h1 className="font-display text-[34px] leading-none">{title}</h1>
        {description && <p className="text-muted-foreground pt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
