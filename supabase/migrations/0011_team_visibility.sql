-- Reps can see each other's calls and scores when the workspace allows it (on by default).
alter table public.organizations add column reps_see_team boolean not null default true;
grant update (reps_see_team) on public.organizations to authenticated;

create or replace function public.can_see_org_calls(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_manager(p_org)
      or (p_org in (select public.my_org_ids())
          and coalesce((select o.reps_see_team from public.organizations o where o.id = p_org), false));
$$;
revoke all on function public.can_see_org_calls(uuid) from public;
grant execute on function public.can_see_org_calls(uuid) to authenticated;

drop policy "read sessions" on public.call_sessions;
create policy "read sessions" on public.call_sessions
  for select using (user_id = auth.uid() or public.can_see_org_calls(org_id));

drop policy "read transcripts" on public.call_transcripts;
create policy "read transcripts" on public.call_transcripts
  for select using (exists (
    select 1 from public.call_sessions s where s.id = session_id
      and (s.user_id = auth.uid() or public.can_see_org_calls(s.org_id))
  ));

drop policy "read scores" on public.call_scores;
create policy "read scores" on public.call_scores
  for select using (exists (
    select 1 from public.call_sessions s where s.id = session_id
      and (s.user_id = auth.uid() or public.can_see_org_calls(s.org_id))
  ));
