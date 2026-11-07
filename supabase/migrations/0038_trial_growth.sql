-- The open trial's two ways to more calls, both on the out-of-calls screen: a reviewed extension request and an
-- introduction email a rep sends to their manager, delivered by us in the rep's name.
create table if not exists public.trial_extension_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  use_case text not null check (use_case in ('ramping', 'testing', 'personal', 'other')),
  people integer not null check (people between 1 and 10000),
  decider text not null check (decider in ('me', 'manager', 'other')),
  timeline text not null check (timeline in ('month', 'quarter', 'none')),
  need text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  calls integer,
  days integer,
  note text,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);
create index if not exists trial_extension_requests_org_idx on public.trial_extension_requests (org_id, created_at desc);
create index if not exists trial_extension_requests_status_idx on public.trial_extension_requests (status, created_at desc);
alter table public.trial_extension_requests enable row level security;
-- No policies: only the service role reads or writes these.

create table if not exists public.manager_intros (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  manager_name text not null,
  manager_email text not null,
  note text,
  sent_at timestamptz,
  opened_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists manager_intros_email_idx on public.manager_intros (lower(manager_email));
create index if not exists manager_intros_user_idx on public.manager_intros (user_id, created_at desc);
alter table public.manager_intros enable row level security;
