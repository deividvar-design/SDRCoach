-- Usage ledger (tokens, voice seconds, estimated cost) and an audit log of internal admin actions.
-- Both are service-role only: RLS on, no policies.

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid references public.call_sessions(id) on delete set null,
  provider text not null check (provider in ('anthropic', 'elevenlabs')),
  kind text not null check (kind in ('score', 'digest', 'voice')),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  seconds int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  created_at timestamptz not null default now()
);
create index usage_events_org_idx on public.usage_events (org_id, created_at desc);
create index usage_events_created_idx on public.usage_events (created_at desc);
alter table public.usage_events enable row level security;

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  org_id uuid references public.organizations(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_org_idx on public.admin_actions (org_id, created_at desc);
alter table public.admin_actions enable row level security;
