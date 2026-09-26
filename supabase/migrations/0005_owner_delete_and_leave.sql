-- Owners can delete their workspace (cascades everywhere); non-owners can remove their own membership.
create policy "owner deletes org" on public.organizations
  for delete using (public.my_role(id) = 'owner');

create policy "member leaves org" on public.memberships
  for delete using (user_id = auth.uid() and role <> 'owner');
