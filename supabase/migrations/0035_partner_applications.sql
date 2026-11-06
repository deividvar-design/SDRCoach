-- Founding-partner program: teams apply on the site, an admin approves, approval issues an access link with the
-- pilot allowance. The application row then tracks whether the team started, and carries the day-30 proof report
-- and the manager's approved quote.
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text,
  company text not null,
  website text,
  sdr_count integer not null check (sdr_count between 1 and 500),
  start_by date not null,
  kickoff_wanted boolean not null default false,
  kickoff_times text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'released', 'completed')),
  access_link_id uuid references public.access_links(id) on delete set null,
  decided_at timestamptz,
  decided_by text,
  released_at timestamptz,
  report jsonb,
  report_token text unique,
  report_sent_at timestamptz,
  checkin jsonb,
  quote text,
  quote_approved_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists partner_applications_email_idx on public.partner_applications (lower(email));
create index if not exists partner_applications_status_idx on public.partner_applications (status, created_at desc);
alter table public.partner_applications enable row level security;
-- No policies: only the service role reads or writes these.

-- Set when a partner's access link is claimed. Checkout offers the founding price to these workspaces after the
-- public founding window closes.
alter table public.organizations add column if not exists partner_since timestamptz;
