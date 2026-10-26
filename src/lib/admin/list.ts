/**
 * URL-driven list state for the admin tables: a page number, a search string and named filters, all in the query
 * string so a view can be reloaded, shared or bookmarked. Pure helpers; the pages decide what each filter means.
 */
export const PER_PAGE = 50;

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ListState {
  page: number;
  per: number;
  /** Zero-based range for Supabase `.range(from, to)`. */
  from: number;
  to: number;
  q: string;
  filters: Record<string, string>;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseList(sp: SearchParams, filterKeys: readonly string[], per = PER_PAGE): ListState {
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(one(sp.page)) || 1)));
  const q = one(sp.q).trim().slice(0, 80);
  const filters: Record<string, string> = {};
  for (const k of filterKeys) {
    const v = one(sp[k]).trim();
    if (v) filters[k] = v.slice(0, 40);
  }
  return { page, per, from: (page - 1) * per, to: page * per - 1, q, filters };
}

/** The same view on another page: every filter kept, only the page number changed. */
export function pageHref(path: string, state: ListState, page: number) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  for (const [k, v] of Object.entries(state.filters)) p.set(k, v);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

/** Escape the characters PostgREST reads as pattern syntax in an ilike filter. */
export function likeTerm(q: string) {
  return `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}

/** In-memory slice for lists that are computed rather than queried. */
export function slicePage<T>(rows: T[], state: ListState) {
  return { rows: rows.slice(state.from, state.to + 1), total: rows.length };
}
