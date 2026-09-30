-- Assignments are gone: they were gameable (level and target could be swapped, instant hang-ups counted) and
-- managers manage in dials per week, not per-target quotas. Calls keep everything else.
alter table public.call_sessions drop column if exists assignment_id;
drop table if exists public.assignments;
