# SDRCoach architecture

## The product in one paragraph
A rep picks a **target** (a prospect persona their team actually calls), a **level** (warm / inbound / cold), and dials. ElevenLabs runs a live, interruptible voice conversation as the prospect. When the call ends, the transcript is stored and Claude grades it on a fixed rubric, producing a report the rep and their manager can read. Company call transcripts uploaded to the **knowledge base** ground both the persona (how prospects in this market talk and object) and the grader (what this team's playbook rewards).

## Tenancy and roles
- `organizations` → `memberships` (`owner` | `manager` | `rep`). One org per user for now; the model allows more.
- Reps: own calls, own assignments, all org targets.
- Managers/owners: everything in the org, plus team, invites, knowledge, org settings.
- Row-level security in Postgres is the security boundary. `requireViewer()`/`requireManager()` exist for UX and redirects.

## Call pipeline (milestone 2)
1. `POST /api/calls` creates a `call_sessions` row (`status = created`) and builds the persona prompt from target + level + org context + knowledge summary.
2. Server mints a **signed ElevenLabs conversation token** for a per-org agent with prompt/voice **overrides** for this session. The client never sees the API key.
3. Client uses `@elevenlabs/react` `useConversation` over WebRTC. Session goes `live`. Client streams transcript events to the server (`PATCH /api/calls/:id`) for a live view.
4. On end: `status = ended`, the ElevenLabs post-call webhook (or the client's end event as a fallback) delivers the final transcript and audio. Audio goes to the private `call-audio` bucket under `org_id/session_id.mp3`.
5. `status = scoring` → Claude grades with a structured output schema → `call_scores` row → `status = scored`. Written with the service-role client.

## Scoring rubric
Six dimensions, 0–10 each, plus overall: opener, discovery, objection_handling, value_prop, close, tone_and_pace. Each has a one-line rationale. Plus 3 strengths, 3 improvements, a coach summary, and time-stamped moments for the replay UI. The rubric is stable so scores are comparable across reps and over time.

## Knowledge grounding
Uploaded transcripts (`knowledge_sources`) are digested by Claude into: common objections with example phrasing, prospect tone, what got meetings booked. That digest (not the raw text) is injected into persona prompts and the grader. Raw text stays server-side only.

## Levels
Defined in `src/lib/domain/levels.ts`. The behavioural brief per level is what changes the ElevenLabs agent's disposition; target data changes *who* it is.

## Not yet built
Billing (Stripe), SSO, per-team grouping under managers, voice cloning from a real prospect, live coaching hints during the call.
