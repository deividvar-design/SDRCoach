-- Free trial: 10 connected calls or 14 days, one trial per company domain.
-- Org creation moves behind the server (service role) so the business-email check cannot be bypassed
-- by calling the RPC directly.

alter table public.organizations
  add column trial_call_limit int not null default 10,
  add column trial_ends_at timestamptz not null default now() + interval '14 days',
  add column trial_domain text unique;

drop function if exists public.create_organization(text, text);

create or replace function public.create_organization(p_name text, p_slug text, p_user_id uuid, p_trial_domain text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;
  if p_trial_domain is not null and exists (select 1 from public.organizations where trial_domain = p_trial_domain) then
    raise exception 'trial_exists' using hint = 'A workspace for this company domain already exists';
  end if;
  insert into public.organizations (name, slug, trial_domain) values (p_name, p_slug, p_trial_domain) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user_id, 'owner');
  insert into public.targets (org_id, created_by, kind, template_key, name, title, company, industry, company_size, persona_notes, pain_points, objections, voice_id)
    select v_org, p_user_id, 'practice', key, name, title, company, industry, company_size, persona_notes, pain_points, objections, voice_id
    from public.target_templates order by sort;
  return v_org;
end $$;

revoke execute on function public.create_organization(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_organization(text, text, uuid, text) to service_role;
