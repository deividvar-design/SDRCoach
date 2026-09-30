-- The currency a subscription was bought in. Stripe fixes it per subscription; the app shows it in Settings.
alter table public.organizations add column billing_currency text check (billing_currency in ('usd', 'eur'));
