-- Funnel events: every form outcome, server-side, without full email addresses. Service role only.
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  reason text,
  -- The address is never stored: the domain for segmenting, a sha-256 for joining the same person across steps.
  email_domain text,
  email_hash text,
  -- A related row id (demo call, user, organisation) when one exists.
  subject text,
  dedupe_key text unique,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_kind_created_idx on public.funnel_events (kind, created_at desc);
alter table public.funnel_events enable row level security;

-- Karen accepts personal addresses now; the row says so, and carries the company the caller typed and the ad click.
alter table public.demo_calls
  add column if not exists company text,
  add column if not exists personal_email boolean not null default false,
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text;

-- The ad click that led to a signup, for Google Ads offline matching.
alter table public.profiles
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists plan_intent text;
