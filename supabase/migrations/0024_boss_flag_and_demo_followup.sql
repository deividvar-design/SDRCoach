-- Boss-fight calls are flagged on the session so stats can leave them out, and demo leads record their follow-up.
alter table public.call_sessions add column boss boolean not null default false;
alter table public.demo_calls add column followup_sent_at timestamptz;
