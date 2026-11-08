-- The country each workspace was created from, as Vercel reads it from the request's IP address at signup. Only the
-- two-letter code is kept, never the address. It lives apart from organizations because members can read their own
-- organization row; this table has RLS on and no policies, so only the service role (the admin pages) reads it.
create table if not exists public.workspace_countries (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  country text not null check (country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
alter table public.workspace_countries enable row level security;
-- No policies: only the service role reads or writes these.
