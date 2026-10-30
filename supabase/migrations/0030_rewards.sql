-- Rewards: extra calls for posts, invites and referrals. Claims are server-only (admin client), like the other
-- internal tables; the app pages read them through the service role after the viewer check.
alter table public.organizations
  add column if not exists bonus_calls integer not null default 0,
  add column if not exists referral_code text unique default lower(substr(md5(gen_random_uuid()::text), 1, 8)),
  add column if not exists referred_by_org_id uuid references public.organizations(id) on delete set null;

update public.organizations set referral_code = lower(substr(md5(gen_random_uuid()::text), 1, 8)) where referral_code is null;

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('linkedin_post', 'x_post', 'scorecard_share', 'invite_rep', 'referral_trial', 'referral_paid')),
  url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  calls integer not null default 0,
  days integer not null default 0,
  note text,
  ref_org_id uuid references public.organizations(id) on delete set null,
  ref_user_id uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);
alter table public.reward_claims enable row level security;

-- One live claim per post kind per workspace; a rejected one can be tried again.
create unique index if not exists reward_claims_once_idx on public.reward_claims (org_id, kind) where kind in ('linkedin_post', 'x_post', 'scorecard_share') and status <> 'rejected';
-- One reward per invited rep, and one per referred workspace per stage.
create unique index if not exists reward_claims_invite_idx on public.reward_claims (org_id, ref_user_id) where kind = 'invite_rep';
create unique index if not exists reward_claims_referral_idx on public.reward_claims (org_id, kind, ref_org_id) where kind in ('referral_trial', 'referral_paid');
create index if not exists reward_claims_status_idx on public.reward_claims (status, created_at desc);
create index if not exists reward_claims_org_idx on public.reward_claims (org_id, created_at desc);
create index if not exists organizations_referred_by_idx on public.organizations (referred_by_org_id);
