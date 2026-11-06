-- Affiliate programme: anyone can get a referral link and earn 25% of what a referred team pays in its first year.
-- Affiliates share the referral-code namespace with workspaces (the /r/<code> link and the ref cookie), so a code is
-- unique across both tables.
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  code text not null unique,
  channel text,
  payout_method text not null check (payout_method in ('paypal', 'bank')),
  payout_details text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  terms_accepted_at timestamptz not null default now(),
  ip text,
  created_at timestamptz not null default now()
);
create unique index if not exists affiliates_email_idx on public.affiliates (lower(email));
alter table public.affiliates enable row level security;
-- No policies: only the service role reads or writes these.

alter table public.organizations add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null;
create index if not exists organizations_affiliate_idx on public.organizations (affiliate_id) where affiliate_id is not null;

-- Every paid invoice, with refunds netted off later. Commission is computed from this ledger, never from Stripe live.
create table if not exists public.payments (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  amount_cents integer not null,
  refunded_cents integer not null default 0,
  currency text not null check (currency in ('usd', 'eur')),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_org_paid_idx on public.payments (org_id, paid_at);
alter table public.payments enable row level security;

-- What has been paid out to an affiliate, so balances below the floor carry over and nothing is paid twice.
create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  currency text not null check (currency in ('usd', 'eur')),
  amount_cents integer not null,
  period text not null,
  paid_at timestamptz not null default now(),
  paid_by text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_payouts_affiliate_idx on public.affiliate_payouts (affiliate_id);
alter table public.affiliate_payouts enable row level security;
