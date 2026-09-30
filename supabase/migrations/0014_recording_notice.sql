-- Reps confirm once, before their first call, that practice calls are recorded, transcribed and visible to their workspace.
alter table public.profiles add column recording_ack_at timestamptz;
