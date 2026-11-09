-- Updating a target only checked that the new workspace was one you belong to, not one you manage. Someone who
-- owns workspace A and is a rep in workspace B could move one of their targets into B, a manager-only power there.
-- The row after the update must also sit in a workspace you manage.
alter policy "managers update targets" on public.targets
  using (public.is_manager(org_id))
  with check (public.is_manager(org_id));
