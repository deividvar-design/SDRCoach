-- When each admin last opened each admin section, so the admin home can say what is new since.
create table if not exists public.admin_seen (
  admin_email text not null,
  section text not null,
  seen_at timestamptz not null default now(),
  primary key (admin_email, section)
);
alter table public.admin_seen enable row level security;
-- No policies: only the service role reads or writes these.
