-- Quarterly billing, offered inside the app (not on the public pricing page).
alter table public.organizations drop constraint if exists organizations_billing_interval_check;
alter table public.organizations add constraint organizations_billing_interval_check check (billing_interval in ('month', 'quarter', 'year'));
