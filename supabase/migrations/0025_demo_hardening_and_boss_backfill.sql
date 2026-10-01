-- Demo: a minted token is a state ('dialing'), scoring is claimed with attempts, and boss calls made before the flag existed are backfilled.
alter table public.demo_calls drop constraint if exists demo_calls_status_check;
alter table public.demo_calls add constraint demo_calls_status_check check (status in ('created', 'dialing', 'live', 'ended', 'scoring', 'scored', 'failed'));
alter table public.demo_calls
  add column finalize_attempts int not null default 0,
  add column scoring_started_at timestamptz,
  add column mints int not null default 0;
update public.call_sessions s set boss = true from public.targets t where t.id = s.target_id and t.kind = 'boss' and s.boss = false;
