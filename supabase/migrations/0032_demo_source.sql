-- Where a Karen call came from, and the browser's analytics id, so the scored report can be reported to product
-- analytics from the server after the caller has left the page.
alter table public.demo_calls
  add column if not exists source_path text,
  add column if not exists objection text,
  add column if not exists analytics_id text,
  add column if not exists analytics_session text;
