-- Three tidy-ups from the Supabase security advisor and a storage review. None changes what the app does.

-- can_see_org_calls is no longer used by any policy (0043 replaced it). Supabase's default privileges had handed
-- anonymous visitors execute on it again; it returns false for them, but they have no business calling it.
revoke execute on function public.can_see_org_calls(uuid) from anon, public;

-- A trigger function, never meant to be called over the API. Triggers keep firing: the right to run a trigger
-- function is checked when the trigger is created, not when it fires (handle_new_user is already set up this way).
revoke execute on function public.sync_profile_email() from anon, authenticated, public;

-- The call-audio bucket is not used yet, but its read rule let any member of a workspace read every recording in
-- it, even with "reps see the team's calls" switched off. Match the rule the call tables use.
alter policy "org reads call audio" on storage.objects
  using (bucket_id = 'call-audio' and (storage.foldername(name))[1] in (select public.call_visible_org_ids()::text));
