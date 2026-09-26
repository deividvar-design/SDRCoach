-- Practice personas, real vs practice targets, prospect-decided outcomes, call metrics.

alter table public.targets
  add column kind text not null default 'real' check (kind in ('real', 'practice')),
  add column template_key text;

alter table public.call_sessions
  add column outcome_reason text,
  add column metrics jsonb,
  add column prospect_summary text;

-- Built-in practice personas. Copied into every new org so managers can edit their copy.
create table public.target_templates (
  key text primary key,
  sort int not null default 0,
  name text not null,
  title text not null,
  company text not null,
  industry text,
  company_size text,
  persona_notes text,
  pain_points text[] not null default '{}',
  objections text[] not null default '{}',
  voice_id text
);
alter table public.target_templates enable row level security;
create policy "authenticated read templates" on public.target_templates
  for select to authenticated using (true);

insert into public.target_templates (key, sort, name, title, company, industry, company_size, persona_notes, pain_points, objections, voice_id) values
('ops-vp-logistics', 1, 'Dana Whitfield', 'VP of Operations', 'Northwind Freight', 'Logistics', '200–500 employees',
 'Direct, numbers-first, fifteen years in freight. Answers in short sentences. Respects people who know her world; cuts off anyone who reads a script. Currently juggling a driver-retention problem and a warehouse move.',
 array['Manual dispatch reporting eats two days a week', 'Driver churn every quarter', 'Board wants margin up 3 points'],
 array['We already have a TMS', 'I get ten of these calls a day', 'Send me an email', 'No budget until next fiscal year'],
 'EXAVITQu4vr4xnSDxMaL'),
('cto-fintech', 2, 'Marcus Oyelaran', 'CTO', 'Ledgerline', 'Fintech', '50–200 employees',
 'Technical, skeptical of vendors, allergic to buzzwords. Will ask how it actually works. Warms up to specifics and honest answers about limitations. Half his attention is on a production incident.',
 array['Compliance reviews slow every release', 'Engineering time lost to vendor integrations', 'Audit season is in eight weeks'],
 array['We build this in-house', 'How is this different from what we have', 'Security review will take six months', 'Who else in fintech uses you'],
 'onwK4e9ZLuTAKqWW03F9'),
('hr-director-healthcare', 3, 'Priya Raman', 'Director of People', 'Meridian Health Group', 'Healthcare', '1,000–5,000 employees',
 'Warm but overloaded. Polite by default, so she will not hang up rudely, but she will drift out of the conversation if it is not about her problems. Cares about nurse retention and onboarding time.',
 array['Onboarding nurses takes 6 weeks', 'Turnover in first 90 days', 'Managers have no time for training'],
 array['We are mid-implementation with another vendor', 'I am not the decision maker', 'Can you send information first', 'We tried something like this and it did not stick'],
 'XrExE9yKIg1WjnnlVkGX'),
('founder-saas', 4, 'Tom Becker', 'Founder & CEO', 'Brightpath Analytics', 'SaaS', '10–50 employees',
 'Fast talker, curious, easily bored. Will ask about price in the first minute. Wants to know the ROI in one sentence. Loves a good opener and will call out a bad one to your face.',
 array['Sales team of four missing quota', 'No time to coach reps himself', 'Runway pressure'],
 array['How much does it cost', 'We are too small for this', 'I can do this with ChatGPT', 'Call me next quarter'],
 'TxGEqnHWrfWFTfGW9XjX'),
('procurement-manufacturing', 5, 'Helen Marsh', 'Head of Procurement', 'Atlas Components', 'Manufacturing', '500–1,000 employees',
 'Process-driven and formal. Everything goes through an RFP. Suspicious of anything that sounds too easy. Will test whether you understand her approval chain. Rewards patience and precision.',
 array['Supplier onboarding takes months', 'Price volatility on raw materials', 'Spreadsheet-based vendor tracking'],
 array['We only buy through RFP', 'You need to talk to my team, not me', 'We have a preferred vendor list', 'What is your lead time'],
 'Xb7hH8MSUJpSbSDYk0k2'),
('marketing-director-retail', 6, 'Jordan Reyes', 'Marketing Director', 'Cobalt Retail Group', 'Retail', '200–500 employees',
 'Friendly and chatty, easy to talk to, hard to close. Will happily spend ten minutes with you and then say "let me think about it". The challenge is getting a concrete next step, not getting a conversation.',
 array['Campaign attribution is guesswork', 'Agency costs climbing', 'CEO wants proof of ROI on brand spend'],
 array['Let me think about it', 'We are happy with our agency', 'Can you send a deck', 'Timing is not great, we are mid-campaign'],
 'pNInz6obpgDQGcFmaJgB');

-- Seed practice personas into a new org.
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organizations (name, slug) values (p_name, p_slug) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  insert into public.targets (org_id, created_by, kind, template_key, name, title, company, industry, company_size, persona_notes, pain_points, objections, voice_id)
    select v_org, auth.uid(), 'practice', key, name, title, company, industry, company_size, persona_notes, pain_points, objections, voice_id
    from public.target_templates order by sort;
  return v_org;
end $$;

-- Reps may update their own session while live (status, conversation id); scores are server-written.
create policy "service writes transcripts" on public.call_transcripts for all to service_role using (true) with check (true);
create policy "service writes scores" on public.call_scores for all to service_role using (true) with check (true);
