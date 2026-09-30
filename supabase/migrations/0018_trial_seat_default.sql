-- New trial workspaces start with one seat. More are granted on request or by picking a plan.
alter table public.organizations alter column seat_limit set default 1;
