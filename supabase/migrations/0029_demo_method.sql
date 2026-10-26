-- How a Karen call was started: the call button, Google sign-in, or the old email form. Shown as the lead's source.
alter table public.demo_calls add column if not exists method text;
