-- Security hardening from the audit.
-- 1. Managers can manage managers and reps, never owners.
-- 2. Members can edit descriptive org columns only; billing/trial columns are server-owned.
-- 3. Reps can only move a call forward and record its connection; everything else is server-owned.
-- 4. Reps cannot read raw uploaded transcripts.
-- 5. Invites can never grant ownership; acceptance checks the invited address and seat limit.
-- 6. Practice personas move into application code; the templates table goes away.

-- 1. memberships
drop policy "managers manage memberships" on public.memberships;
create policy "managers add members" on public.memberships
  for insert with check (public.is_manager(org_id) and role <> 'owner');
create policy "managers change non-owner roles" on public.memberships
  for update using (public.is_manager(org_id) and role <> 'owner')
  with check (public.is_manager(org_id) and role <> 'owner');
create policy "managers remove non-owners" on public.memberships
  for delete using (public.is_manager(org_id) and role <> 'owner');

-- 5. invites
alter table public.invites add constraint invites_role_not_owner check (role <> 'owner');

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
    on conflict (org_id, user_id) do update set role = excluded.role;
  update public.invites set accepted_at = now() where id = v_invite.id;
  return v_invite.org_id;
end $$;

-- 2. organizations: column-level update grant
revoke update on public.organizations from authenticated;
grant update (name, company_description, product_description, ideal_customer_profile) on public.organizations to authenticated;
alter table public.organizations add constraint organizations_plan_check
  check (plan in ('trial', 'starter', 'team', 'enterprise', 'canceled'));

-- 3. call_sessions: column grant + state machine trigger for end users
revoke update on public.call_sessions from authenticated;
grant update (status, elevenlabs_conversation_id, started_at, ended_at) on public.call_sessions to authenticated;

create or replace function public.guard_call_session_update()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new; -- service role owns scoring and repairs
  end if;
  if not (
    (old.status = 'created' and new.status in ('created', 'live', 'ended', 'failed')) or
    (old.status = 'live' and new.status in ('live', 'ended'))
  ) then
    raise exception 'invalid call status transition % -> %', old.status, new.status;
  end if;
  if old.elevenlabs_conversation_id is not null and new.elevenlabs_conversation_id is distinct from old.elevenlabs_conversation_id then
    raise exception 'conversation id is immutable';
  end if;
  return new;
end $$;

create trigger call_sessions_guard before update on public.call_sessions
  for each row execute function public.guard_call_session_update();

-- assignments: reps never write them (completion is set by the server)
drop policy "rep completes own assignment" on public.assignments;

-- targets: an update may not move a target to another org
drop policy "managers or creator update targets" on public.targets;
create policy "managers or creator update targets" on public.targets
  for update using (public.is_manager(org_id) or created_by = auth.uid())
  with check (org_id in (select public.my_org_ids()));

-- 4. knowledge_sources: raw text and extracted digests are server-only
revoke select on public.knowledge_sources from authenticated;
grant select (id, org_id, uploaded_by, name, kind, storage_path, status, summary, error, created_at) on public.knowledge_sources to authenticated;

-- 6. practice personas live in code now
alter table public.targets drop column template_key;
drop table public.target_templates;

create or replace function public.create_organization(p_name text, p_slug text, p_user_id uuid, p_trial_domain text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;
  if p_trial_domain is not null and exists (select 1 from public.organizations where trial_domain = p_trial_domain) then
    raise exception 'trial_exists' using hint = 'A workspace for this company domain already exists';
  end if;
  insert into public.organizations (name, slug, trial_domain) values (p_name, p_slug, p_trial_domain) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user_id, 'owner');
  return v_org;
end $$;

-- advisor: pin the trigger function search path
alter function public.guard_call_session_update() set search_path = public;
