import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { pageHref, type ListState } from "@/lib/admin/list";

export interface FilterSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Search and filters for an admin list, as a plain GET form: the URL is the state, so every view is reloadable and
 * shareable. Submitting resets to page one because the page number is not a field.
 */
export function ListToolbar({ path, state, filters, placeholder = "Search" }: { path: string; state: ListState; filters: FilterSpec[]; placeholder?: string }) {
  const active = Boolean(state.q) || Object.keys(state.filters).length > 0;
  return (
    <form action={path} method="get" className="flex flex-wrap items-end gap-2 border-b px-5 py-3">
      <div className="min-w-48 flex-1">
        <label htmlFor={`${path}-q`} className="sr-only">Search</label>
        <Input id={`${path}-q`} name="q" type="search" defaultValue={state.q} placeholder={placeholder} className="h-9" />
      </div>
      {filters.map((f) => (
        <div key={f.key}>
          <label htmlFor={`${path}-${f.key}`} className="text-muted-foreground mb-1 block text-xs">{f.label}</label>
          <Select id={`${path}-${f.key}`} name={f.key} defaultValue={state.filters[f.key] ?? ""} className="h-9">
            <option value="">All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      ))}
      <Button type="submit" size="sm" variant="outline" className="h-9">Apply</Button>
      {active && <Link href={path} className="text-muted-foreground self-center text-xs underline underline-offset-4">Clear</Link>}
    </form>
  );
}

/** "1–50 of 213" with previous and next, keeping the search and filters. */
export function Pager({ path, state, total }: { path: string; state: ListState; total: number }) {
  const pages = Math.max(1, Math.ceil(total / state.per));
  const first = total === 0 ? 0 : state.from + 1;
  const last = Math.min(total, state.to + 1);
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-4 border-t px-5 py-3 text-xs">
      <span>{total === 0 ? "Nothing matches" : `${first}–${last} of ${total}`}</span>
      <span className="flex items-center gap-1">
        <PageLink href={pageHref(path, state, state.page - 1)} disabled={state.page <= 1} label="Previous page"><ChevronLeft className="size-4" /></PageLink>
        <span className="tabular px-2">{state.page} / {pages}</span>
        <PageLink href={pageHref(path, state, state.page + 1)} disabled={state.page >= pages} label="Next page"><ChevronRight className="size-4" /></PageLink>
      </span>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled className="text-muted-foreground/40 inline-flex size-8 items-center justify-center rounded-md border">{children}</span>;
  return <Link href={href} aria-label={label} className="hover:bg-accent inline-flex size-8 items-center justify-center rounded-md border">{children}</Link>;
}
