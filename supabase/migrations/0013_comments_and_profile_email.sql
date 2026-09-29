-- Manager comments on a call report. Readable by whoever can read the call; written by any member who can read it.
create table public.call_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.call_sessions(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index call_comments_session_idx on public.call_comments (session_id, created_at);
create index call_comments_org_idx on public.call_comments (org_id, created_at desc);
alter table public.call_comments enable row level security;

create policy "read comments on visible calls" on public.call_comments
  for select using (exists (
    select 1 from public.call_sessions s where s.id = session_id
      and (s.user_id = auth.uid() or public.can_see_org_calls(s.org_id))
  ));
create policy "members comment on visible calls" on public.call_comments
  for insert with check (
    author_id = auth.uid()
    and org_id in (select public.my_org_ids())
    and exists (
      select 1 from public.call_sessions s where s.id = session_id and s.org_id = call_comments.org_id
        and (s.user_id = auth.uid() or public.can_see_org_calls(s.org_id))
    )
  );
create policy "authors delete own comments" on public.call_comments
  for delete using (author_id = auth.uid() or public.is_manager(org_id));

-- Profiles carry the email so the Team page and digests can show and reach people without auth admin calls.
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
