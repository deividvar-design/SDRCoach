-- Karen is called first and the email is asked for afterwards, so a demo row can exist without one.
alter table public.demo_calls alter column email drop not null;
alter table public.demo_calls alter column domain drop not null;
alter table public.demo_calls add column if not exists email_added_at timestamptz;
