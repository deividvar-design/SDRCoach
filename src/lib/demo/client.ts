/**
 * In-memory stand-in for the Supabase client, enabled with SDRCOACH_DEMO=1.
 * Supports the query shapes the app uses (select with embedded relations, eq/neq/in/is,
 * order, limit, single/maybeSingle, count head, insert/update/upsert/delete, rpc, auth, storage).
 * Purely for screenshots and UI work without a database. Not a test double for RLS.
 */
import { ASSIGNMENTS, DEMO_USER, INVITES, KNOWLEDGE, MEMBERSHIPS, ORG, PROFILES, SCORES, SESSIONS, TARGETS, TRANSCRIPTS, USAGE } from "./fixtures";

type Row = Record<string, unknown>;

const TABLES: Record<string, Row[]> = {
  organizations: [ORG as unknown as Row],
  profiles: PROFILES as unknown as Row[],
  memberships: MEMBERSHIPS as unknown as Row[],
  invites: INVITES as unknown as Row[],
  targets: TARGETS as unknown as Row[],
  assignments: ASSIGNMENTS as unknown as Row[],
  call_sessions: SESSIONS as unknown as Row[],
  call_transcripts: TRANSCRIPTS as unknown as Row[],
  call_scores: SCORES as unknown as Row[],
  knowledge_sources: KNOWLEDGE as unknown as Row[],
  usage_events: USAGE as unknown as Row[],
  admin_actions: [],
  email_log: [],
  billing_events: [],
};

interface Relation {
  table: string;
  column: string;
  /** Reverse one-to-one: the related row points at us. */
  reverse?: boolean;
}

const RELATIONS: Record<string, Record<string, Relation>> = {
  memberships: { organizations: { table: "organizations", column: "org_id" }, profiles: { table: "profiles", column: "user_id" } },
  call_sessions: {
    targets: { table: "targets", column: "target_id" },
    profiles: { table: "profiles", column: "user_id" },
    organizations: { table: "organizations", column: "org_id" },
    call_scores: { table: "call_scores", column: "session_id", reverse: true },
    call_transcripts: { table: "call_transcripts", column: "session_id", reverse: true },
  },
  assignments: { targets: { table: "targets", column: "target_id" }, profiles: { table: "profiles", column: "assigned_to" } },
  invites: { profiles: { table: "profiles", column: "invited_by" } },
  targets: { profiles: { table: "profiles", column: "created_by" } },
  knowledge_sources: { profiles: { table: "profiles", column: "uploaded_by" } },
};

const KEY: Record<string, string> = { call_transcripts: "session_id", call_scores: "session_id" };

function splitTopLevel(s: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function pick(row: Row, cols: string, table: string): Row {
  if (cols === "*" || cols === "") return { ...row };
  const out: Row = {};
  for (const part of splitTopLevel(cols)) {
    const m = part.match(/^([a-z_]+)(?:!([a-z_]+))?\(([\s\S]*)\)$/);
    if (m) {
      const [, rel, , inner] = m;
      out[rel!] = embed(row, table, rel!, inner ?? "*");
    } else if (part === "*") Object.assign(out, row);
    else out[part] = row[part];
  }
  return out;
}

function embed(row: Row, table: string, rel: string, inner: string) {
  const r = RELATIONS[table]?.[rel];
  if (!r) return null;
  const rows = TABLES[r.table] ?? [];
  const match = r.reverse ? rows.find((x) => x[r.column] === row.id) : rows.find((x) => x[KEY[r.table] ?? "id"] === row[r.column]);
  return match ? pick(match, inner, r.table) : null;
}

type Filter = (row: Row) => boolean;

class Query implements PromiseLike<{ data: unknown; error: null; count: number | null }> {
  private filters: Filter[] = [];
  private cols = "*";
  private head = false;
  private wantCount = false;
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private max: number | null = null;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private one: "single" | "maybe" | null = null;
  private returning = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.mode !== "select") this.returning = true;
    this.cols = cols.replace(/\s+/g, "");
    this.head = Boolean(opts?.head);
    this.wantCount = Boolean(opts?.count);
    return this;
  }
  insert(v: Row | Row[]) { this.mode = "insert"; this.payload = v; return this; }
  upsert(v: Row | Row[]) { this.mode = "upsert"; this.payload = v; return this; }
  update(v: Row) { this.mode = "update"; this.payload = v; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: unknown) { this.filters.push((r) => r[col] !== val); return this; }
  in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  is(col: string, val: unknown) { this.filters.push((r) => r[col] == val); return this; }
  not(col: string, op: string, val: unknown) { if (op === "is") this.filters.push((r) => r[col] != val); return this; }
  gt(col: string, val: string | number) { this.filters.push((r) => (r[col] as string | number) > val); return this; }
  gte(col: string, val: string | number) { this.filters.push((r) => (r[col] as string | number) >= val); return this; }
  lt(col: string, val: string | number) { this.filters.push((r) => (r[col] as string | number) < val); return this; }
  lte(col: string, val: string | number) { this.filters.push((r) => (r[col] as string | number) <= val); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ col, asc: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst ?? false }); return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private run() {
    const rows = TABLES[this.table] ?? (TABLES[this.table] = []);
    const key = KEY[this.table] ?? "id";
    let affected: Row[] = [];

    if (this.mode === "insert" || this.mode === "upsert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => ({ [key]: `demo-${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString(), ...p }));
      for (const item of items) {
        const idx = rows.findIndex((r) => r[key] === item[key]);
        if (idx >= 0 && this.mode === "upsert") rows[idx] = { ...rows[idx], ...item };
        else rows.push(item);
      }
      affected = items;
    } else {
      affected = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.mode === "update") affected.forEach((r) => Object.assign(r, this.payload));
      if (this.mode === "delete") for (const r of affected) rows.splice(rows.indexOf(r), 1);
    }

    for (const o of [...this.orders].reverse()) {
      affected.sort((a, b) => {
        const av = a[o.col] as string | number | null;
        const bv = b[o.col] as string | number | null;
        if (av == null && bv == null) return 0;
        if (av == null) return o.nullsFirst ? -1 : 1;
        if (bv == null) return o.nullsFirst ? 1 : -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * (o.asc ? 1 : -1);
      });
    }
    const count = affected.length;
    if (this.max != null) affected = affected.slice(0, this.max);

    if (this.mode !== "select" && !this.returning) return { data: null, error: null, count: null };
    if (this.head) return { data: null, error: null, count };

    const projected = affected.map((r) => pick(r, this.cols, this.table));
    if (this.one) return { data: projected[0] ?? null, error: null, count: null };
    return { data: projected, error: null, count: this.wantCount ? count : null };
  }

  then<R1 = unknown, R2 = never>(onfulfilled?: ((v: { data: unknown; error: null; count: number | null }) => R1 | PromiseLike<R1>) | null, onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null) {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export function createDemoClient() {
  return {
    from: (table: string) => new Query(table),
    rpc: async () => ({ data: ORG.id, error: null }),
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      admin: {
        getUserById: async (id: string) => {
          const p = PROFILES.find((x) => x.id === id);
          return { data: { user: p ? { id, email: `${p.full_name?.split(" ")[0]?.toLowerCase() ?? "user"}@brightline.io` } : null }, error: null };
        },
      },
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: { session: {} }, error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  };
}

export const DEMO = process.env.SDRCOACH_DEMO === "1";
