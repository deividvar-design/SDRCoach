-- Sessions are created and driven by the server only: reps can no longer insert or update call_sessions rows.
drop policy if exists "rep creates own session" on public.call_sessions;
drop policy if exists "rep updates own session" on public.call_sessions;
revoke insert on public.call_sessions from authenticated;
revoke update on public.call_sessions from authenticated;

alter table public.call_sessions
  add column prompt_hash text,
  add column finalize_attempts int not null default 0;

-- One open call per rep.
create unique index call_sessions_one_open_idx on public.call_sessions (user_id) where status in ('created', 'live');

-- One voice usage row per session (dedupe first: keep the earliest).
delete from public.usage_events u using public.usage_events k
  where u.kind = 'voice' and k.kind = 'voice' and u.session_id = k.session_id and u.created_at > k.created_at;
create unique index usage_events_voice_once_idx on public.usage_events (session_id) where kind = 'voice';

-- Targets: managers write; everyone reads.
drop policy if exists "org inserts targets" on public.targets;
create policy "managers insert targets" on public.targets
  for insert with check (public.is_manager(org_id) and created_by = auth.uid());
drop policy if exists "managers or creator update targets" on public.targets;
create policy "managers update targets" on public.targets
  for update using (public.is_manager(org_id)) with check (org_id in (select public.my_org_ids()));

-- Memberships: created only through accept_invite / service role; managers may change role, nothing else.
drop policy if exists "managers add members" on public.memberships;
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

-- accept_invite never lowers an existing role.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invites%rowtype;
  v_seats int;
  v_used int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_invite from public.invites
    where token = p_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'invite invalid or expired';
  end if;
  if lower(v_invite.email) <> lower(coalesce(auth.email(), '')) then
    raise exception 'invite_email_mismatch';
  end if;
  select seat_limit into v_seats from public.organizations where id = v_invite.org_id;
  select count(*) into v_used from public.memberships where org_id = v_invite.org_id;
  if v_used >= v_seats and not exists (select 1 from public.memberships where org_id = v_invite.org_id and user_id = auth.uid()) then
    raise exception 'no_seats_left';
  end if;
  insert into public.memberships (org_id, user_id, role)
    values (v_invite.org_id, auth.uid(), v_invite.role)
    on conflict (org_id, user_id) do update set role = excluded.role
      where public.memberships.role = 'rep' and excluded.role = 'manager';
  update public.invites set accepted_at = now() where id = v_invite.id;
  return v_invite.org_id;
end $$;

-- Trial domains ledger: deleting a workspace no longer resets the company trial.
create table public.trial_domains (
  domain text primary key,
  org_id uuid,
  created_at timestamptz not null default now()
);
alter table public.trial_domains enable row level security;
insert into public.trial_domains (domain, org_id)
  select trial_domain, id from public.organizations where trial_domain is not null
  on conflict do nothing;

create or replace function public.create_organization(p_name text, p_slug text, p_user_id uuid, p_trial_domain text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;
  if p_trial_domain is not null and (
    exists (select 1 from public.organizations where trial_domain = p_trial_domain)
    or exists (select 1 from public.trial_domains where domain = p_trial_domain)
  ) then
    raise exception 'trial_exists' using hint = 'A workspace for this company domain already exists';
  end if;
  insert into public.organizations (name, slug, trial_domain) values (p_name, p_slug, p_trial_domain) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user_id, 'owner');
  if p_trial_domain is not null then
    insert into public.trial_domains (domain, org_id) values (p_trial_domain, v_org) on conflict do nothing;
  end if;
  return v_org;
end $$;
