-- The company website on an access link, and the workspace context drafted from it when the link was made, so the
-- recipient lands with the prospects already briefed and a first buyer to call.
alter table public.access_links
  add column if not exists website text,
  add column if not exists draft jsonb,
  add column if not exists draft_error text;
