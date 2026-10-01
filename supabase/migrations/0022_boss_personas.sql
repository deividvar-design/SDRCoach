-- Boss-fight personas: deliberately hostile characters for composure training and demos.
alter table public.targets drop constraint if exists targets_kind_check;
alter table public.targets add constraint targets_kind_check check (kind in ('real', 'practice', 'boss'));
