import { cn } from "@/lib/utils";

export function PageHeader({ title, eyebrow, description, actions, className }: { title: React.ReactNode; eyebrow?: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        {eyebrow && <div className="text-muted-foreground text-sm">{eyebrow}</div>}
        <h1 className="font-display text-[32px] leading-tight">{title}</h1>
        {description && <p className="text-foreground/80 pt-1 text-[15px] md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
