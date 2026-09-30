-- When the current scoring claim started. Staleness is judged from this, never from ended_at, which is pinned to
-- the hang-up time and made every late review look stuck.
alter table public.call_sessions add column scoring_started_at timestamptz;
create index call_sessions_status_idx on public.call_sessions (status, scoring_started_at, ended_at);
create index call_sessions_review_idx on public.call_sessions (status, review_requested_at) where review_requested_at is not null;
create index usage_events_org_kind_idx on public.usage_events (org_id, kind);

-- Members may edit their own name, avatar and recording acknowledgement. Email is synced from auth by trigger and
-- must not be user-writable: it feeds the Team page and digest recipients.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, recording_ack_at) on public.profiles to authenticated;
