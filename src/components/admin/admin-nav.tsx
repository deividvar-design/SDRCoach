import Link from "next/link";
import { cn } from "@/lib/utils";
import { ADMIN_SECTIONS, type AdminSection, type Badge } from "@/lib/admin/badges";

/**
 * The admin section links with their counts. A red count is a decision waiting; a grey one is how much arrived since
 * this admin last opened the section. Opening the section clears the grey one.
 */
export function AdminNav({ badges, current }: { badges: Record<AdminSection, Badge>; current?: AdminSection }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-x-4 gap-y-2">
      {ADMIN_SECTIONS.map((s) => {
        const b = badges[s.key];
        const isCurrent = s.key === current;
        return (
          <Link key={s.key} href={s.href} aria-current={isCurrent ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 text-sm underline-offset-4", isCurrent ? "text-foreground font-medium" : "underline")}>
            {s.label}
            {b.action > 0 && <Count tone="action" n={b.action} label={`${b.action} waiting for a decision`} />}
            {b.fresh > 0 && !isCurrent && <Count tone="fresh" n={b.fresh} label={`${b.fresh} new since your last visit`} />}
          </Link>
        );
      })}
    </nav>
  );
}

function Count({ n, tone, label }: { n: number; tone: "action" | "fresh"; label: string }) {
  return (
    <span aria-label={label} title={label} className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-medium tabular", tone === "action" ? "bg-destructive text-white" : "bg-muted text-muted-foreground")}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
