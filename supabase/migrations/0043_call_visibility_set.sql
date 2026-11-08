-- Call visibility as a set, worked out once per query. The old rule called can_see_org_calls(org_id) for every row,
-- and a security-definer function is never inlined, so a team list paid three lookups per call. Same rule:
-- you see a call if it is yours, or if you manage its workspace, or the workspace lets reps see the team.

create or replace function public.call_visible_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.org_id
  from public.memberships m
  join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid() and (m.role in ('owner', 'manager') or coalesce(o.reps_see_team, false))
$$;
revoke all on function public.call_visible_org_ids() from public, anon;
grant execute on function public.call_visible_org_ids() to authenticated;

alter policy "read sessions" on public.call_sessions
  using ((user_id = (select auth.uid())) or org_id in (select public.call_visible_org_ids()));

alter policy "read scores" on public.call_scores
  using (exists (select 1 from public.call_sessions s where s.id = call_scores.session_id and (s.user_id = (select auth.uid()) or s.org_id in (select public.call_visible_org_ids()))));

alter policy "read transcripts" on public.call_transcripts
  using (exists (select 1 from public.call_sessions s where s.id = call_transcripts.session_id and (s.user_id = (select auth.uid()) or s.org_id in (select public.call_visible_org_ids()))));

alter policy "read comments on visible calls" on public.call_comments
  using (exists (select 1 from public.call_sessions s where s.id = call_comments.session_id and (s.user_id = (select auth.uid()) or s.org_id in (select public.call_visible_org_ids()))));

alter policy "members comment on visible calls" on public.call_comments
  with check (
    author_id = (select auth.uid())
    and org_id in (select my_org_ids())
    and exists (select 1 from public.call_sessions s where s.id = call_comments.session_id and s.org_id = call_comments.org_id and (s.user_id = (select auth.uid()) or s.org_id in (select public.call_visible_org_ids())))
  );

-- The target page lists a target's calls; the foreign key also needs it when a target is deleted.
create index if not exists call_sessions_target_idx on public.call_sessions (target_id, created_at desc) where target_id is not null;
-- Trial and monthly call counts filter on org, kind and date together.
create index if not exists usage_events_org_kind_created_idx on public.usage_events (org_id, kind, created_at);
