-- Public boss-fight demo: no account, a work email, one call against Karen. Server-only table (no policies).
create table public.demo_calls (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  domain text not null,
  ip text,
  newsletter boolean not null default false,
  status text not null default 'created' check (status in ('created', 'live', 'ended', 'scoring', 'scored', 'failed')),
  elevenlabs_conversation_id text,
  prompt_hash text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  outcome text,
  outcome_reason text,
  overall numeric(4, 2),
  score jsonb,
  transcript jsonb,
  error text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index demo_calls_email_idx on public.demo_calls (lower(email));
create index demo_calls_domain_idx on public.demo_calls (domain, created_at desc);
create index demo_calls_ip_idx on public.demo_calls (ip, created_at desc);
create index demo_calls_created_idx on public.demo_calls (created_at desc);
alter table public.demo_calls enable row level security;
