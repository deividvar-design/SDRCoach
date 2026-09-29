/**
 * Fixture data for demo mode (SDRCOACH_DEMO=1). Used for screenshots, design review and local UI
 * work without a Supabase project. Never enabled in a real deployment.
 */
import type { Assignment, CallScore, CallSession, CallTranscript, Invite, KnowledgeSource, Membership, Organization, Profile, Target, TranscriptTurn, UsageEvent } from "@/types/database";

const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - d);
  t.setUTCHours(h, 12, 0, 0);
  return t.toISOString();
};

export const ORG: Organization = {
  id: "org-1",
  name: "Brightline Outbound",
  slug: "brightline",
  plan: "team",
  seat_limit: 10,
  company_description: "Brightline sells fleet telematics to mid-market logistics companies.",
  product_description: "A dashboard and driver app that cut fuel spend and idle time; typically $40–80 per vehicle per month.",
  ideal_customer_profile: "VP Ops or fleet managers at 100–1,000 vehicle fleets in freight, last-mile and field services.",
  trial_call_limit: 10,
  trial_ends_at: daysAgo(-9),
  trial_domain: "brightline.io",
  stripe_customer_id: "cus_demo",
  stripe_subscription_id: "sub_demo",
  stripe_price_id: "price_demo_team_month",
  billing_interval: "month",
  subscription_status: "active",
  current_period_end: daysAgo(-21),
  cancel_at_period_end: false,
  created_at: daysAgo(40),
};

export const PROFILES: Profile[] = [
  { id: "u-deividas", full_name: "Deividas Varnas", avatar_url: null, created_at: daysAgo(40) },
  { id: "u-maya", full_name: "Maya Chen", avatar_url: null, created_at: daysAgo(30) },
  { id: "u-luka", full_name: "Luka Petrov", avatar_url: null, created_at: daysAgo(28) },
  { id: "u-sara", full_name: "Sara Okafor", avatar_url: null, created_at: daysAgo(20) },
  { id: "u-tomas", full_name: "Tomas Brandt", avatar_url: null, created_at: daysAgo(12) },
];

export const MEMBERSHIPS: Membership[] = [
  { id: "m-1", org_id: ORG.id, user_id: "u-deividas", role: "owner", manager_id: null, created_at: daysAgo(40) },
  { id: "m-2", org_id: ORG.id, user_id: "u-maya", role: "rep", manager_id: "u-deividas", created_at: daysAgo(30) },
  { id: "m-3", org_id: ORG.id, user_id: "u-luka", role: "rep", manager_id: "u-deividas", created_at: daysAgo(28) },
  { id: "m-4", org_id: ORG.id, user_id: "u-sara", role: "manager", manager_id: null, created_at: daysAgo(20) },
  { id: "m-5", org_id: ORG.id, user_id: "u-tomas", role: "rep", manager_id: "u-sara", created_at: daysAgo(12) },
];

export const INVITES: Invite[] = [
  { id: "i-1", org_id: ORG.id, email: "jonas@brightline.io", role: "rep", token: "demo-token", invited_by: "u-deividas", expires_at: daysAgo(-5), accepted_at: null, created_at: daysAgo(1) },
];

const t = (id: string, kind: Target["kind"], name: string, title: string, company: string, industry: string, size: string, notes: string, pains: string[], objections: string[], d: number): Target => ({
  id, org_id: ORG.id, created_by: "u-deividas", name, title, company, industry, company_size: size, persona_notes: notes, pain_points: pains, objections, voice_id: null, is_archived: false, kind, created_at: daysAgo(d), updated_at: daysAgo(d),
});

export const TARGETS: Target[] = [
  t("tg-real-1", "real", "Rebecca Lindqvist", "VP Operations", "Halvorsen Freight", "Logistics", "500–1,000 employees", "Ex-driver turned exec. Blunt, hates jargon, cares about fuel cost per mile. Just came back from a board meeting about margins.", ["Fuel spend up 14% YoY", "No visibility into idle time", "Insurance premiums rising after two incidents"], ["We already use Samsara", "Send me a one-pager", "Not this quarter"], 6),
  t("tg-real-2", "real", "Daniel Mbeki", "Fleet Manager", "Cobalt Field Services", "Field services", "200–500 employees", "Hands-on, friendly, wants to look good to his VP. Will ask what it costs early.", ["Techs finish late because routing is manual", "Vehicle downtime tracked in a spreadsheet"], ["How much does it cost", "My VP makes that call", "We tried telematics before and drivers hated it"], 5),
  t("tg-real-3", "real", "Anna Kowalczyk", "Head of Logistics", "Petram Building Supplies", "Construction supply", "1,000–5,000 employees", "Formal, careful, process-driven. Everything goes through procurement.", ["Delivery windows missed on 1 in 5 drops", "Depot managers each run their own tools"], ["We only buy through RFP", "Talk to procurement", "What is your lead time"], 3),
  t("ops-vp-logistics", "practice", "Dana Whitfield", "VP of Operations", "Northwind Freight", "Logistics", "200–500 employees", "Direct, numbers-first, fifteen years in freight. Answers in short sentences. Respects people who know her world; cuts off anyone who reads a script.", ["Manual dispatch reporting eats two days a week", "Driver churn every quarter", "Board wants margin up 3 points"], ["We already have a TMS", "I get ten of these calls a day", "Send me an email", "No budget until next fiscal year"], 40),
  t("cto-fintech", "practice", "Marcus Oyelaran", "CTO", "Ledgerline", "Fintech", "50–200 employees", "Technical, skeptical of vendors, allergic to buzzwords. Will ask how it actually works.", ["Compliance reviews slow every release", "Engineering time lost to vendor integrations"], ["We build this in-house", "How is this different", "Security review will take six months"], 40),
  t("hr-director-healthcare", "practice", "Priya Raman", "Director of People", "Meridian Health Group", "Healthcare", "1,000–5,000 employees", "Warm but overloaded. Polite by default, drifts out of the conversation if it is not about her problems.", ["Onboarding nurses takes 6 weeks", "Turnover in first 90 days"], ["We are mid-implementation with another vendor", "I am not the decision maker", "Send information first"], 40),
  t("founder-saas", "practice", "Tom Becker", "Founder & CEO", "Brightpath Analytics", "SaaS", "10–50 employees", "Fast talker, curious, easily bored. Will ask about price in the first minute.", ["Sales team of four missing quota", "No time to coach reps himself"], ["How much does it cost", "We are too small for this", "Call me next quarter"], 40),
  t("procurement-manufacturing", "practice", "Helen Marsh", "Head of Procurement", "Atlas Components", "Manufacturing", "500–1,000 employees", "Process-driven and formal. Everything goes through an RFP. Rewards patience and precision.", ["Supplier onboarding takes months", "Spreadsheet-based vendor tracking"], ["We only buy through RFP", "You need to talk to my team", "What is your lead time"], 40),
  t("marketing-director-retail", "practice", "Jordan Reyes", "Marketing Director", "Cobalt Retail Group", "Retail", "200–500 employees", "Friendly and chatty, easy to talk to, hard to close. Will happily spend ten minutes and then say \"let me think about it\".", ["Campaign attribution is guesswork", "Agency costs climbing"], ["Let me think about it", "We are happy with our agency", "Can you send a deck"], 40),
];

interface SessionSpec {
  id: string; user: string; target: string; difficulty: CallSession["difficulty"]; outcome: CallSession["outcome"]; score: number; day: number; hour: number; duration: number;
}

const SPECS: SessionSpec[] = [
  { id: "s-1", user: "u-deividas", target: "tg-real-1", difficulty: "cold", outcome: "meeting_booked", score: 8.2, day: 0, hour: 9, duration: 412 },
  { id: "s-2", user: "u-maya", target: "ops-vp-logistics", difficulty: "inbound", outcome: "callback", score: 6.8, day: 0, hour: 8, duration: 301 },
  { id: "s-3", user: "u-luka", target: "tg-real-2", difficulty: "cold", outcome: "rejected", score: 4.9, day: 0, hour: 11, duration: 148 },
  { id: "s-4", user: "u-deividas", target: "cto-fintech", difficulty: "inbound", outcome: "meeting_booked", score: 7.6, day: 1, hour: 15, duration: 388 },
  { id: "s-5", user: "u-tomas", target: "founder-saas", difficulty: "warm", outcome: "meeting_booked", score: 7.1, day: 1, hour: 10, duration: 260 },
  { id: "s-6", user: "u-maya", target: "tg-real-3", difficulty: "cold", outcome: "info_sent", score: 6.2, day: 1, hour: 9, duration: 233 },
  { id: "s-7", user: "u-deividas", target: "ops-vp-logistics", difficulty: "cold", outcome: "hung_up", score: 5.4, day: 2, hour: 14, duration: 96 },
  { id: "s-8", user: "u-luka", target: "hr-director-healthcare", difficulty: "warm", outcome: "meeting_booked", score: 7.4, day: 2, hour: 10, duration: 344 },
  { id: "s-9", user: "u-sara", target: "tg-real-1", difficulty: "inbound", outcome: "meeting_booked", score: 8.6, day: 2, hour: 16, duration: 371 },
  { id: "s-10", user: "u-deividas", target: "tg-real-2", difficulty: "inbound", outcome: "callback", score: 7.0, day: 3, hour: 9, duration: 290 },
  { id: "s-11", user: "u-tomas", target: "marketing-director-retail", difficulty: "warm", outcome: "info_sent", score: 5.8, day: 3, hour: 13, duration: 402 },
  { id: "s-12", user: "u-maya", target: "founder-saas", difficulty: "warm", outcome: "meeting_booked", score: 7.9, day: 4, hour: 9, duration: 255 },
  { id: "s-13", user: "u-deividas", target: "procurement-manufacturing", difficulty: "inbound", outcome: "rejected", score: 6.1, day: 4, hour: 11, duration: 210 },
  { id: "s-14", user: "u-luka", target: "tg-real-2", difficulty: "cold", outcome: "hung_up", score: 4.2, day: 5, hour: 10, duration: 71 },
  { id: "s-15", user: "u-deividas", target: "cto-fintech", difficulty: "warm", outcome: "meeting_booked", score: 8.0, day: 6, hour: 9, duration: 320 },
  { id: "s-16", user: "u-maya", target: "ops-vp-logistics", difficulty: "inbound", outcome: "callback", score: 6.5, day: 7, hour: 15, duration: 276 },
  { id: "s-17", user: "u-tomas", target: "founder-saas", difficulty: "warm", outcome: "rejected", score: 5.1, day: 8, hour: 10, duration: 190 },
  { id: "s-18", user: "u-deividas", target: "founder-saas", difficulty: "warm", outcome: "meeting_booked", score: 7.7, day: 9, hour: 9, duration: 298 },
  { id: "s-19", user: "u-luka", target: "hr-director-healthcare", difficulty: "warm", outcome: "info_sent", score: 6.0, day: 10, hour: 14, duration: 330 },
  { id: "s-20", user: "u-deividas", target: "ops-vp-logistics", difficulty: "warm", outcome: "meeting_booked", score: 6.9, day: 12, hour: 9, duration: 265 },
];

export const SESSIONS: CallSession[] = SPECS.map((s) => ({
  id: s.id,
  org_id: ORG.id,
  user_id: s.user,
  target_id: s.target,
  assignment_id: null,
  difficulty: s.difficulty,
  status: "scored",
  outcome: s.outcome,
  elevenlabs_conversation_id: `conv_${s.id}`,
  elevenlabs_agent_id: "agent_demo",
  started_at: daysAgo(s.day, s.hour),
  ended_at: daysAgo(s.day, s.hour),
  duration_seconds: s.duration,
  audio_path: null,
  error: null,
  outcome_reason: s.outcome === "meeting_booked" ? "They actually knew our fuel numbers and asked for fifteen minutes on Thursday. Fine." : s.outcome === "callback" ? "Interesting enough, but I'm mid-quarter close. Call me in two weeks." : s.outcome === "info_sent" ? "Send me something I can forward to my ops lead." : s.outcome === "rejected" ? "We're locked into Samsara until next year. Not worth both our time." : "Third vendor call this morning and they opened with 'how are you today'.",
  metrics: {
    rep_talk_ratio: Math.min(0.72, Math.max(0.38, 0.85 - s.score * 0.05)),
    longest_rep_monologue_secs: Math.round(60 - s.score * 4),
    rep_questions: Math.round(s.score),
    filler_words: Math.round(14 - s.score),
    first_objection_secs: 38,
    rep_turns: 14,
    prospect_turns: 15,
    interruptions_by_rep: s.score > 7 ? 0 : 2,
  },
  prospect_summary: null,
  review_requested_at: daysAgo(s.day, s.hour),
  review_skipped_at: null,
  created_at: daysAgo(s.day, s.hour),
}));

const dim = (score: number, rationale: string) => ({ score, rationale });

// One call collected but not reviewed: the rep has not decided yet.
SESSIONS.push({
  ...SESSIONS[SESSIONS.length - 1],
  id: "s-21",
  status: "collected",
  outcome: "callback",
  outcome_reason: "Interesting enough, but I'm mid-quarter close. Call me in two weeks.",
  prospect_summary: "The rep opened with a fleet-size hook, asked two discovery questions about idle time, then pitched for most of the call. The prospect asked to be called back after quarter close.",
  review_requested_at: null,
  review_skipped_at: null,
  started_at: daysAgo(0, 9),
  ended_at: daysAgo(0, 9),
  created_at: daysAgo(0, 9),
});

export const SCORES: CallScore[] = SPECS.map((s) => {
  const base = s.score;
  const v = (offset: number) => Math.max(1, Math.min(10, Math.round((base + offset) * 10) / 10));
  return {
    session_id: s.id,
    overall: base,
    dimensions: {
      opener: dim(v(0.6), "Named yourself and Brightline in one breath and got straight to it. No 'is this a bad time'. Rebecca gave you the extra ten seconds because of it."),
      reason_for_call: dim(v(0.4), "\"The reason I'm calling is your fleet grew past 400 trucks last year\" is exactly the shape. Specific to her, stated in the first 20 seconds."),
      discovery: dim(v(-0.8), "Two good questions about idle time, then you moved to pitch before she finished her answer about the insurance renewal. That was the door."),
      objection_handling: dim(v(-0.3), "On 'we already use Samsara' you acknowledged it and asked what they use it for. Good. On 'not this quarter' you accepted it too fast."),
      value_prop: dim(v(0.1), "Tied idle time to fuel cost per mile, which is her language. Stayed under thirty seconds."),
      close: dim(v(0.5), "Asked for fifteen minutes Thursday at ten, held through the soft no, confirmed the invite. Textbook."),
    },
    strengths: [
      "Reason for call in the first 20 seconds, tied to her fleet size",
      "Handled 'we already use Samsara' by asking what they use it for instead of arguing",
      "Proposed a specific slot and confirmed it",
    ],
    improvements: [
      "When she mentioned the insurance renewal at 1:42, stop and ask about it. That is the real trigger event.",
      "Cut the 45-second product explanation at 2:10 in half. She was ready to talk before you finished.",
      "Try 'what would need to be true for this quarter?' instead of accepting 'not this quarter'.",
    ],
    coach_summary:
      base >= 7.5
        ? "That is a booked meeting on a Level 3 prospect, and you earned it in the first thirty seconds with a reason for calling she could not brush off. The one thing I want you to do differently: when she brought up the insurance renewal, that was the moment to slow down and ask, not speed up. You got the meeting anyway. Next time you'll get a warmer one."
        : "Solid fundamentals and a clean opener. Where it slipped was discovery: you asked two good questions and then pitched for forty-five seconds while she was still ready to talk. She told you she has a renewal coming and you went past it. Ask about the thing they volunteer. Then close the same way you did here, because the close was good.",
    moments: [
      { t_ms: 4000, label: "Clean reason for call", kind: "good" },
      { t_ms: 102000, label: "Missed the renewal trigger", kind: "missed" },
      { t_ms: 130000, label: "45s monologue", kind: "missed" },
      { t_ms: 238000, label: "Acknowledged Samsara well", kind: "good" },
      { t_ms: 355000, label: "Specific close", kind: "good" },
    ],
    model: "claude-opus-5",
    created_at: daysAgo(s.day, s.hour),
  };
});

const turns: TranscriptTurn[] = [
  { role: "prospect", text: "Lindqvist.", t_start_ms: 0 },
  { role: "rep", text: "Rebecca, it's Deividas from Brightline. I know you weren't expecting this call. The reason I'm calling is your fleet grew past four hundred trucks last year and most VPs we talk to at that size are fighting fuel spend they can't see. Fair to take thirty seconds?", t_start_ms: 4000 },
  { role: "prospect", text: "Thirty seconds. Go.", t_start_ms: 21000 },
  { role: "rep", text: "When you look at fuel cost per mile across the fleet right now, how much of that do you think is idle time?", t_start_ms: 24000 },
  { role: "prospect", text: "Honestly, no idea. That's the problem. Fuel is up fourteen percent and I can't tell the board which depots are the issue.", t_start_ms: 33000 },
  { role: "rep", text: "That's most of the conversations we have. What are you using to track it today?", t_start_ms: 46000 },
  { role: "prospect", text: "Samsara on about half the trucks. The rest is spreadsheets. And we've got an insurance renewal in six weeks after two incidents, so I've got bigger fires.", t_start_ms: 52000 },
  { role: "rep", text: "Got it. So let me tell you what Brightline does. We put a small unit in every vehicle and the dashboard gives you idle time, harsh braking, fuel per mile by depot, by driver, by route, updated every fifteen minutes. Most fleets your size see idle time drop by about a fifth within the first quarter because drivers can see their own numbers in the app, and managers get a weekly digest. It also integrates with your fuel cards so the numbers tie out to what finance sees, and the reporting is built for board packs so you're not rebuilding slides every month.", t_start_ms: 102000 },
  { role: "prospect", text: "Okay. We already use Samsara though. Why would I run two of these?", t_start_ms: 150000 },
  { role: "rep", text: "You wouldn't. What are you using Samsara for today, the cameras or the fuel side?", t_start_ms: 238000 },
  { role: "prospect", text: "Cameras, mostly. The fuel reporting never got set up properly.", t_start_ms: 246000 },
  { role: "rep", text: "That's the usual split. We tend to sit next to the cameras and own the fuel and idle piece. I'm not going to pretend I can fix that on a cold call. What I'd suggest is fifteen minutes Thursday at ten, I'll show you the depot view with a fleet your size, and you tell me if it's worth going further.", t_start_ms: 300000 },
  { role: "prospect", text: "Not this quarter. I've got the renewal.", t_start_ms: 330000 },
  { role: "rep", text: "Understood. Fifteen minutes, and if it's not relevant to the renewal conversation you never hear from me again. Thursday at ten, or is Friday better?", t_start_ms: 355000 },
  { role: "prospect", text: "Thursday at ten. Send me an invite.", t_start_ms: 380000 },
  { role: "rep", text: "Done. Thanks Rebecca, talk Thursday.", t_start_ms: 400000 },
];

export const TRANSCRIPTS: CallTranscript[] = SESSIONS.map((s) => ({
  session_id: s.id,
  turns,
  full_text: turns.map((x) => `${x.role}: ${x.text}`).join("\n"),
  created_at: s.created_at,
}));

export const ASSIGNMENTS: Assignment[] = [
  { id: "a-1", org_id: ORG.id, assigned_to: "u-deividas", assigned_by: "u-sara", target_id: "tg-real-3", difficulty: "cold", required_calls: 3, due_at: daysAgo(-3), note: "Before the Petram outreach sequence starts.", completed_at: null, created_at: daysAgo(2) },
  { id: "a-2", org_id: ORG.id, assigned_to: "u-deividas", assigned_by: "u-sara", target_id: "procurement-manufacturing", difficulty: "inbound", required_calls: 2, due_at: daysAgo(-7), note: null, completed_at: null, created_at: daysAgo(1) },
];

export const KNOWLEDGE: KnowledgeSource[] = [
  { id: "k-1", org_id: ORG.id, uploaded_by: "u-deividas", name: "gong-export-q3-fleet-calls.csv", kind: "call_transcript", storage_path: "org-1/k-1.csv", raw_text: "…", status: "ready", summary: "142 connected cold calls into logistics VPs and fleet managers from Q3. Teaches how prospects push back on 'we already have Samsara' and which reason-for-call lines earned thirty seconds.", extracted: null, error: null, created_at: daysAgo(6) },
  { id: "k-2", org_id: ORG.id, uploaded_by: "u-sara", name: "Brightline cold call script v4", kind: "script", storage_path: null, raw_text: "…", status: "ready", summary: "The current opener, three reason-for-call variants by segment, and the fifteen-minute close.", extracted: null, error: null, created_at: daysAgo(4) },
  { id: "k-3", org_id: ORG.id, uploaded_by: "u-deividas", name: "objections-master-sheet.csv", kind: "objection_sheet", storage_path: "org-1/k-3.csv", raw_text: "…", status: "processing", summary: null, extracted: null, error: null, created_at: daysAgo(0, 8) },
];

export const DEMO_USER = { id: "u-deividas", email: "deividas@brightline.io" };

export const USAGE: UsageEvent[] = SESSIONS.flatMap((s, i) => [
  { id: `ue-v-${i}`, org_id: ORG.id, session_id: s.id, provider: "elevenlabs" as const, kind: "voice" as const, model: null, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, seconds: s.duration_seconds ?? 0, cost_usd: Math.round(((s.duration_seconds ?? 0) / 60) * 0.1 * 100000) / 100000, created_at: s.created_at },
  { id: `ue-s-${i}`, org_id: ORG.id, session_id: s.id, provider: "anthropic" as const, kind: "score" as const, model: "claude-opus-5", input_tokens: 3200 + i * 40, output_tokens: 1400, cache_read_tokens: 1800, cache_write_tokens: 0, seconds: 0, cost_usd: 0.052, created_at: s.created_at },
]);
