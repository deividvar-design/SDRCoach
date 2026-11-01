-- Karen calls cost the same voice minutes and scoring tokens as workspace calls but had no usage rows, so the
-- admin cost chart ignored them. A usage row can now belong to a demo call instead of a workspace.
alter table public.usage_events alter column org_id drop not null;
alter table public.usage_events add column if not exists demo_id uuid references public.demo_calls(id) on delete set null;
create index if not exists usage_events_demo_idx on public.usage_events (demo_id);
create unique index if not exists usage_events_demo_voice_once_idx on public.usage_events (demo_id) where kind = 'voice' and demo_id is not null;

-- Backfill voice rows for the Karen calls already made, at the ElevenAgents rate ($0.08 a minute plus the prospect
-- model's tokens, about $0.02 a minute). Scoring tokens were not kept, so those stay unrecorded for old calls.
insert into public.usage_events (org_id, session_id, demo_id, provider, kind, seconds, cost_usd, created_at)
select null, null, d.id, 'elevenlabs', 'voice', d.duration_seconds, round((d.duration_seconds / 60.0) * 0.10, 5), coalesce(d.ended_at, d.created_at)
from public.demo_calls d
where d.duration_seconds > 0 and not exists (select 1 from public.usage_events u where u.demo_id = d.id and u.kind = 'voice');
