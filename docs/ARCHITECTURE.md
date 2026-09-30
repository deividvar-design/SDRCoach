# 100 Dials architecture

## The product in one paragraph
A rep picks a **target** (a prospect persona their team actually calls), a **level** (warm / inbound / cold), and dials. ElevenLabs runs a live, interruptible voice conversation as the prospect. When the call ends, the transcript is stored and Claude grades it on a fixed rubric, producing a report the rep and their manager can read. Company call transcripts uploaded to the **knowledge base** ground both the persona (how prospects in this market talk and object) and the grader (what this team's playbook rewards).

## Tenancy and roles
- `organizations` → `memberships` (`owner` | `manager` | `rep`). One org per user for now; the model allows more.
- Reps: own calls, all live org targets.
- Managers/owners: everything in the org, plus team, invites, knowledge, org settings.
- Row-level security in Postgres is the security boundary. `requireViewer()`/`requireManager()` exist for UX and redirects.

## Call pipeline
One ElevenLabs agent serves every org (`ELEVENLABS_AGENT_ID`, created by `pnpm elevenlabs:setup`); every call overrides its prompt, first line and voice.

1. Browser `POST /api/calls` with target + level. Server builds the persona prompt (`src/lib/prompts/persona.ts`) from target, level brief, org context and the org's knowledge digests, inserts `call_sessions` (`created`), mints a WebRTC conversation token, and returns token + overrides. The API key never reaches the browser.
2. Browser plays a ringback tone, then `useConversation().startSession({ conversationToken, overrides })`. On connect it `POST /api/calls/:id/start` with the ElevenLabs conversation id (`live`). Transcript events render live client-side only.
3. On hang-up (either side; the agent has the `end_call` system tool and is told to use it) the browser `POST /api/calls/:id/end` (`ended`) and navigates to the report, which polls.
4. `finalizeCall` (`src/lib/calls/finalize.ts`, service role, idempotent via the `→ scoring` compare-and-set) runs in two phases. **Collect** always happens: fetch the conversation from ElevenLabs (polls up to a minute for analysis to be `done`, otherwise hands the session back to `ended` for a retry), store `call_transcripts`, compute deterministic metrics, record voice usage, take the prospect's decision from the agent's data collection, set `collected`. **Score** runs only once `review_requested_at` is set: the report page asks the rep whether they want the review (`ReviewPrompt`, server actions in `sessions/[id]/actions.ts`), so calls the rep already knows went badly never spend grader tokens. Scoring stores `call_scores` and sets `scored`. While a review is pending, `ReviewWatcher` in the app shell polls `/api/calls/pending` and pops a toast (plus a system notification if the tab is hidden) when the score lands.
5. The ElevenLabs post-call webhook (`/api/webhooks/elevenlabs`, HMAC verified) triggers the same finalize as a safety net for closed tabs.

**Outcome is decided by the prospect.** The agent has two post-call data-collection fields (`outcome`, `outcome_reason`) extracted by ElevenLabs from the prospect's own closing words. The grader's inferred outcome is only the fallback.

## Scoring
`src/lib/scoring/rubric.ts` defines six 0–10 dimensions: opener, reason_for_call, discovery, objection_handling, value_prop, close, with weights (reason for call, objections and close weigh most, matching what books meetings). Anchored in Gong's published analysis of 300M+ cold calls: explicit reason-for-call lifts success ~2x, "did I catch you at a bad time?" cuts it ~40%, the job of the call is to sell the meeting. `metrics.ts` computes talk ratio, longest monologue, questions, fillers, first objection and interruptions deterministically from turn timings; they are shown next to the model's judgement and fed to it. `score.ts` uses `messages.parse` with a Zod schema on `claude-opus-5`.

Level recommendations (`src/lib/stats/progress.ts`): three calls averaging ≥ 7 at a level earns a "ready for the next level" nudge. Nothing is locked.

## Engagement loops
Streak (consecutive days with a call), personal best, weekly team leaderboard, level readiness, and a count-up score reveal straight after the call. Deliberately no locks or penalties: the loop is "call → immediate specific feedback → one concrete thing to try → call again".

## Knowledge grounding
Managers upload CSV/TXT exports (Gong, Chorus, dialers) or paste text. `src/lib/knowledge/parse.ts` normalises the common CSV shapes. Files land in the private `knowledge` bucket under `org_id/`, text in `knowledge_sources.raw_text`, and `digest.ts` has Claude extract objections with real phrasing, prospect tone, what worked, what failed and vocabulary. The latest five digests (never the raw text) are injected into persona prompts and the grader.

## Levels
Defined in `src/lib/domain/levels.ts`. The behavioural brief per level is what changes the ElevenLabs agent's disposition; target data changes *who* it is.

## Trials and billing
Self-serve signup is business-email only: `src/lib/email/business.ts` checks the address against the `free-email-domains` and `disposable-email-domains` lists (including subdomains), then confirms the domain has MX records. It runs in the signup action and again in the onboarding action before a workspace is created. Workspace creation goes through the service-role client (`create_organization` is executable only by `service_role`), so the check cannot be bypassed with a direct RPC call. Invited teammates skip the gate: their manager vouches for them.

Every new workspace gets the six practice personas from `src/content/practice-personas.ts` inserted on creation. Every new org is `plan = 'trial'` with `trial_call_limit = 10`, `trial_ends_at = now() + 14 days`, and a unique `trial_domain` so a company gets one trial. `src/lib/billing/trial.ts` computes status from connected calls only; `POST /api/calls` returns 402 with `code: "trial_exhausted"` when the trial is spent, the app shell shows a banner, and `/upgrade` shows the plans. Plans live in `src/lib/billing/plans.ts` and feed both `/pricing` and `/upgrade`. Stripe Checkout starts subscriptions, the customer portal manages them, and a signature-verified webhook syncs state (`src/lib/billing/sync.ts`).

## Internal admin console
`/admin` is visible only to emails in `ADMIN_EMAILS`; everyone else gets a 404. It reads with the service role across all workspaces: plan and trial state, seats, calls, and estimated cost from `usage_events`, which the scorer, the digest job and the call finalizer write (tokens, voice seconds, USD estimate from `src/lib/usage/pricing.ts`). Actions (extend trial, set plan and seats, notes) are recorded in `admin_actions`. Plan changes there override the app only and never touch Stripe.

## Theme
System light/dark with a manual override (`src/components/theme`). Tokens in `globals.css`: warm paper / warm graphite, ink primary, one hot "signal" colour reserved for live and dial states.

## Not yet built
SSO, usage metering for call allowances and overage, copying recordings into our own storage, live coaching hints during the call.

## Trust boundaries added in the hardening pass

- `call_sessions` is server-owned: reps have no insert or update grant. `POST /api/calls` inserts with the service role and stores a SHA-256 of the prospect prompt it issued; `finalizeCall` compares it with the override ElevenLabs recorded on the conversation and marks a mismatch `collected`/`incomplete` with `error = "prompt mismatch"`, never scored. One open call per rep and one voice usage row per session are unique indexes (migration 0012).
- Targets are manager-only. Target text, company context and the transcript are framed as evidence in both prompts; lengths are capped in the action.
- Every finalize claim bumps `finalize_attempts` and pins `ended_at`. Transcript still processing → hand back to `ended` (up to three waits); scorer failure → stay `collected` with the error and let the report retry; five attempts → stop. Collected data is written before scoring starts, so nothing is lost.
- Recovery paths: `/end` is compare-and-set; `/api/calls/[id]/finalize` (rep or manager) retries `ended`, `collected`+requested, and frees a `scoring` claim older than five minutes; `sweepStaleSessions` does the cheap status repairs inline and defers transcript fetches to `after()` on the dial path; the daily cron (exempt from the login proxy) sends emails first, then sweeps a capped batch.
- Team visibility (`organizations.reps_see_team`, default on) is enforced by `can_see_org_calls()` in the read policies for sessions, transcripts, scores and comments.
- `call_comments` (migration 0013) are notes on a call from anyone who can read it; the rep sees them on the dashboard. `profiles.email` is synced from `auth.users` by trigger so digests and the Team page never need admin lookups.
- Monday digest: `buildWeeklyDigest` aggregates the last seven days per workspace; `sendLifecycle` dedupes on `weekly_digest:<date>` per manager.
- Deleting a call (`deleteCall`) removes the ElevenLabs conversation too, so the privacy page's promise holds.
