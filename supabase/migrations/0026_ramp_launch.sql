-- Ramp launch: signup intent and callback number on profiles; shareable scorecards and the leaderboard on demo calls.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists signup_reason text,
  add column if not exists signup_goal text,
  add column if not exists hero_variant text;

alter table public.demo_calls
  add column if not exists share_slug text,
  add column if not exists display_name text,
  add column if not exists display_company text,
  add column if not exists leaderboard_opt_in boolean not null default false,
  add column if not exists shared_at timestamptz;

create unique index if not exists demo_calls_share_slug_idx on public.demo_calls (share_slug) where share_slug is not null;
-- The public counter and the leaderboard both scan a month of scored calls.
create index if not exists demo_calls_scored_month_idx on public.demo_calls (created_at desc) where status = 'scored';

-- Callback numbers: one call per number per day, logged here when the outbound call ships.
create table if not exists public.callback_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  status text not null default 'queued',
  elevenlabs_conversation_id text,
  outcome text,
  duration_seconds integer,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists callback_calls_phone_day_idx on public.callback_calls (phone, created_at desc);
alter table public.callback_calls enable row level security;
-- Service role only; no policies on purpose.
