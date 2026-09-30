-- Per-call flavour rolled by the server: the prospect's mood and whether a gatekeeper answered first.
alter table public.call_sessions
  add column mood text,
  add column gatekeeper boolean not null default false;
