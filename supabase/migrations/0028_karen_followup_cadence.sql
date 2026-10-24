-- Karen demo leads get a four-email cadence instead of one follow-up.
-- followup_step counts the cadence emails sent (0 to 4); followup_sent_at is when the last one went out.
-- followup_stopped_at ends the cadence: unsubscribe, a trial signup, an internal address, or an earlier call by the same person.
alter table public.demo_calls add column followup_step smallint not null default 0;
alter table public.demo_calls add column followup_stopped_at timestamptz;

-- Rows that already had the old single follow-up, or opted out of it, stay out of the new cadence.
update public.demo_calls set followup_stopped_at = followup_sent_at where followup_sent_at is not null;

create index demo_calls_cadence_idx on public.demo_calls (created_at) where status = 'scored' and followup_stopped_at is null;
