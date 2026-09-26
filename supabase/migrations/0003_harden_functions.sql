-- Lock down SECURITY DEFINER helpers (from the Supabase security advisor).
-- RLS helpers stay executable by signed-in users because policies evaluate them as the caller.
-- Trigger functions are never called through the API.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

revoke execute on function public.my_org_ids() from public, anon;
revoke execute on function public.my_role(uuid) from public, anon;
revoke execute on function public.is_manager(uuid) from public, anon;
revoke execute on function public.create_organization(text, text) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;

grant execute on function public.my_org_ids() to authenticated, service_role;
grant execute on function public.my_role(uuid) to authenticated, service_role;
grant execute on function public.is_manager(uuid) to authenticated, service_role;
grant execute on function public.create_organization(text, text) to authenticated, service_role;
grant execute on function public.accept_invite(text) to authenticated, service_role;
