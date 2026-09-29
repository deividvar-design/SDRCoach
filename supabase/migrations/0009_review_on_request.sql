-- Reviews are opt-in per call. After a call ends the transcript and outcome are collected automatically;
-- the coach's score runs only when the rep (or the sweep on their behalf) asks for it.
alter type public.session_status add value if not exists 'collected';

alter table public.call_sessions
  add column review_requested_at timestamptz,
  add column review_skipped_at timestamptz;
