-- Same rules, evaluated once per query instead of once per row: wrapping auth.uid() in a select lets Postgres
-- compute it a single time (Supabase advisor "auth_rls_initplan"). The hot ones are the call list, scores and
-- transcripts, read on every dashboard, calls and report page.

alter policy "read sessions" on public.call_sessions
  using ((user_id = (select auth.uid())) or can_see_org_calls(org_id));

alter policy "read scores" on public.call_scores
  using (exists (select 1 from public.call_sessions s where s.id = call_scores.session_id and (s.user_id = (select auth.uid()) or can_see_org_calls(s.org_id))));

alter policy "read transcripts" on public.call_transcripts
  using (exists (select 1 from public.call_sessions s where s.id = call_transcripts.session_id and (s.user_id = (select auth.uid()) or can_see_org_calls(s.org_id))));

alter policy "read comments on visible calls" on public.call_comments
  using (exists (select 1 from public.call_sessions s where s.id = call_comments.session_id and (s.user_id = (select auth.uid()) or can_see_org_calls(s.org_id))));

alter policy "members comment on visible calls" on public.call_comments
  with check (
    author_id = (select auth.uid())
    and org_id in (select my_org_ids())
    and exists (select 1 from public.call_sessions s where s.id = call_comments.session_id and s.org_id = call_comments.org_id and (s.user_id = (select auth.uid()) or can_see_org_calls(s.org_id)))
  );

alter policy "authors delete own comments" on public.call_comments
  using ((author_id = (select auth.uid())) or is_manager(org_id));

alter policy "member leaves org" on public.memberships
  using ((user_id = (select auth.uid())) and (role <> 'owner'::member_role));

alter policy "read own or org-mate profile" on public.profiles
  using ((id = (select auth.uid())) or exists (select 1 from public.memberships m where m.user_id = profiles.id and m.org_id in (select my_org_ids())));

alter policy "update own profile" on public.profiles
  using (id = (select auth.uid()));

alter policy "managers insert targets" on public.targets
  with check (is_manager(org_id) and (created_by = (select auth.uid())));
