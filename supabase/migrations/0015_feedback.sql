-- In-app feedback. Written by the server only (service role); read on the admin console. Nobody reads it through RLS.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  role text,
  page text,
  user_agent text,
  body text not null check (char_length(body) between 1 and 4000),
  reply_ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
