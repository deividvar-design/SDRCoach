-- Admin-issued access links: an email, a company and a call allowance. The recipient opens the link, sets a
-- password and lands in a ready workspace, skipping the signup page and the trial's domain rule.
create table if not exists public.access_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  email text not null,
  company text not null,
  calls integer not null default 10,
  days integer not null default 14,
  note text,
  created_by text not null,
  expires_at timestamptz not null default now() + interval '30 days',
  claimed_at timestamptz,
  revoked_at timestamptz,
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists access_links_email_idx on public.access_links(lower(email));
alter table public.access_links enable row level security;
-- No policies: only the service role reads or writes these.
