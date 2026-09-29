-- Structured objections extracted by the grader, so managers can see what the team hears most and how it is handled.
alter table public.call_scores add column objections jsonb not null default '[]'::jsonb;
