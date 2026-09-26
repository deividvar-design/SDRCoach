-- Stripe billing state on the org, webhook idempotency, and a log of lifecycle emails sent.

alter table public.organizations
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column stripe_price_id text,
  add column billing_interval text check (billing_interval in ('month', 'year')),
  add column subscription_status text,
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false;

create table public.billing_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now()
);
create unique index email_log_once_idx on public.email_log (org_id, kind, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.email_log enable row level security;
-- Both tables are written only by the service role.
