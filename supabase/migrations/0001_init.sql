-- 100 Dials initial schema
-- Multi-tenant B2B: organizations -> memberships (owner | manager | rep)
-- Core loop: rep runs a simulated cold call against a target persona at a difficulty level,
-- ElevenLabs handles the live voice conversation, transcript is stored, Claude scores it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'manager', 'rep');

-- Level 1: warm, friendly, low resistance (beginner)
-- Level 2: inbound lead, busy and a little skeptical but responsive
-- Level 3: realistic cold prospect, highly resistant, challenges everything
create type public.difficulty as enum ('warm', 'inbound', 'cold');

create type public.session_status as enum ('created', 'live', 'ended', 'scoring', 'scored', 'failed');

create type public.call_outcome as enum ('meeting_booked', 'callback', 'info_sent', 'rejected', 'hung_up', 'incomplete');

create type public.source_status as enum ('pending', 'processing', 'ready', 'failed');

create type public.source_kind as enum ('call_transcript', 'script', 'playbook', 'objection_sheet');

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'trial',
  seat_limit int not null default 5,
  -- Company context injected into every persona prompt so prospects react to *this* seller.
  company_description text,
  product_description text,
  ideal_customer_profile text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'rep',
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);
create index memberships_org_idx on public.memberships(org_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'rep',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_org_idx on public.invites(org_id);

-- ---------------------------------------------------------------------------
-- Targets: the prospect the AI will imitate
-- ---------------------------------------------------------------------------
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  title text not null,
  company text not null,
  industry text,
  company_size text,
  -- Free-text persona: personality, priorities, current stack, what they care about.
  persona_notes text,
  pain_points text[] not null default '{}',
  objections text[] not null default '{}',
  -- ElevenLabs voice to use for this prospect (optional; falls back to a level default).
  voice_id text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index targets_org_idx on public.targets(org_id);

-- Manager assigns practice to a rep.
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  target_id uuid not null references public.targets(id) on delete cascade,
  difficulty public.difficulty not null default 'warm',
  required_calls int not null default 1,
  due_at timestamptz,
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index assignments_rep_idx on public.assignments(assigned_to);
create index assignments_org_idx on public.assignments(org_id);

-- ---------------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------------
create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid references public.targets(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  difficulty public.difficulty not null,
  status public.session_status not null default 'created',
  outcome public.call_outcome,
  elevenlabs_conversation_id text unique,
  elevenlabs_agent_id text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  audio_path text,
  error text,
  created_at timestamptz not null default now()
);
create index call_sessions_org_idx on public.call_sessions(org_id, created_at desc);
create index call_sessions_user_idx on public.call_sessions(user_id, created_at desc);

create table public.call_transcripts (
  session_id uuid primary key references public.call_sessions(id) on delete cascade,
  -- [{ role: 'rep' | 'prospect', text, t_start_ms, t_end_ms }]
  turns jsonb not null default '[]'::jsonb,
  full_text text,
  created_at timestamptz not null default now()
);

create table public.call_scores (
  session_id uuid primary key references public.call_sessions(id) on delete cascade,
  overall numeric(4,1) not null check (overall >= 0 and overall <= 10),
  -- { opener, discovery, objection_handling, value_prop, close, tone_and_pace } each { score, rationale }
  dimensions jsonb not null,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  coach_summary text not null,
  -- Notable moments the UI can jump to: [{ t_ms, label, kind: 'good' | 'missed' }]
  moments jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Knowledge: real company call transcripts / scripts used to ground personas
-- ---------------------------------------------------------------------------
create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  name text not null,
  kind public.source_kind not null default 'call_transcript',
  storage_path text,
  raw_text text,
  status public.source_status not null default 'pending',
  -- Extracted by Claude: common objections, how prospects talk, winning patterns.
  summary text,
  extracted jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index knowledge_sources_org_idx on public.knowledge_sources(org_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger targets_updated_at before update on public.targets
  for each row execute function public.set_updated_at();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Orgs the current user belongs to. security definer so it can be used inside RLS
-- policies on memberships itself without recursion.
create or replace function public.my_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

create or replace function public.my_role(p_org uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select role from public.memberships where user_id = auth.uid() and org_id = p_org
$$;

create or replace function public.is_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and org_id = p_org and role in ('owner', 'manager')
  )
$$;

-- Atomic org creation: org + owner membership in one call.
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organizations (name, slug) values (p_name, p_slug) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  return v_org;
end $$;

-- Accept an invite by token for the current user.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_invite from public.invites
    where token = p_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'invite invalid or expired';
  end if;
  insert into public.memberships (org_id, user_id, role)
    values (v_invite.org_id, auth.uid(), v_invite.role)
    on conflict (org_id, user_id) do update set role = excluded.role;
  update public.invites set accepted_at = now() where id = v_invite.id;
  return v_invite.org_id;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.targets enable row level security;
alter table public.assignments enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_transcripts enable row level security;
alter table public.call_scores enable row level security;
alter table public.knowledge_sources enable row level security;

-- organizations
create policy "members read org" on public.organizations
  for select using (id in (select public.my_org_ids()));
create policy "managers update org" on public.organizations
  for update using (public.is_manager(id));

-- profiles: visible to anyone sharing an org with you
create policy "read own or org-mate profile" on public.profiles
  for select using (
    id = auth.uid() or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id and m.org_id in (select public.my_org_ids())
    )
  );
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

-- memberships
create policy "read org memberships" on public.memberships
  for select using (org_id in (select public.my_org_ids()));
create policy "managers manage memberships" on public.memberships
  for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));

-- invites: managers only (acceptance goes through accept_invite)
create policy "managers manage invites" on public.invites
  for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));

-- targets: everyone in org reads; managers + creators write
create policy "org reads targets" on public.targets
  for select using (org_id in (select public.my_org_ids()));
create policy "org inserts targets" on public.targets
  for insert with check (org_id in (select public.my_org_ids()) and created_by = auth.uid());
create policy "managers or creator update targets" on public.targets
  for update using (public.is_manager(org_id) or created_by = auth.uid());
create policy "managers delete targets" on public.targets
  for delete using (public.is_manager(org_id));

-- assignments: rep sees own; managers see and manage all
create policy "rep reads own assignments" on public.assignments
  for select using (assigned_to = auth.uid() or public.is_manager(org_id));
create policy "managers manage assignments" on public.assignments
  for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));
create policy "rep completes own assignment" on public.assignments
  for update using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());

-- call sessions: rep sees own; managers see whole org
create policy "read sessions" on public.call_sessions
  for select using (user_id = auth.uid() or public.is_manager(org_id));
create policy "rep creates own session" on public.call_sessions
  for insert with check (user_id = auth.uid() and org_id in (select public.my_org_ids()));
create policy "rep updates own session" on public.call_sessions
  for update using (user_id = auth.uid());

create policy "read transcripts" on public.call_transcripts
  for select using (exists (
    select 1 from public.call_sessions s where s.id = session_id
      and (s.user_id = auth.uid() or public.is_manager(s.org_id))
  ));
create policy "read scores" on public.call_scores
  for select using (exists (
    select 1 from public.call_sessions s where s.id = session_id
      and (s.user_id = auth.uid() or public.is_manager(s.org_id))
  ));
-- transcripts and scores are written by the server (service role) after the call ends.

-- knowledge sources: managers manage, org reads summaries
create policy "org reads knowledge" on public.knowledge_sources
  for select using (org_id in (select public.my_org_ids()));
create policy "managers manage knowledge" on public.knowledge_sources
  for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));

-- ---------------------------------------------------------------------------
-- Storage buckets (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('call-audio', 'call-audio', false),
  ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

create policy "org reads call audio" on storage.objects for select
  using (bucket_id = 'call-audio' and (storage.foldername(name))[1] in (select public.my_org_ids()::text));
create policy "managers manage knowledge files" on storage.objects for all
  using (bucket_id = 'knowledge' and public.is_manager(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'knowledge' and public.is_manager(((storage.foldername(name))[1])::uuid));
