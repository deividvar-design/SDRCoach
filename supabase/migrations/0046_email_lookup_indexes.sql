-- Email lookups that had no usable index. The Karen "already played" check filters on the address as stored
-- (always lower case), but the only index was on lower(email), which that filter cannot use. The nightly job looks
-- a profile up by email once per follow-up.
create index if not exists demo_calls_email_minted_idx on public.demo_calls (email) where prompt_hash is not null;
create index if not exists profiles_email_idx on public.profiles (email);
