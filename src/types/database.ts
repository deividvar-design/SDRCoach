/**
 * Hand-maintained mirror of supabase/migrations. Regenerate with
 * `supabase gen types typescript` once a project is linked.
 */
export type MemberRole = "owner" | "manager" | "rep";
export type Difficulty = "warm" | "inbound" | "cold";
export type SessionStatus = "created" | "live" | "ended" | "collected" | "scoring" | "scored" | "failed";
export type CallOutcome =
  | "meeting_booked"
  | "callback"
  | "info_sent"
  | "rejected"
  | "hung_up"
  | "incomplete";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";
export type SourceKind = "call_transcript" | "script" | "playbook" | "objection_sheet";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TranscriptTurn = {
  role: "rep" | "prospect";
  /** Set when the agent spoke as the gatekeeper rather than the prospect. */
  speaker?: "gatekeeper";
  text: string;
  t_start_ms?: number;
  t_end_ms?: number;
  interrupted?: boolean;
}

export type ScoreDimension = {
  score: number;
  rationale: string;
}

export type ScoreDimensions = {
  opener: ScoreDimension;
  reason_for_call: ScoreDimension;
  discovery: ScoreDimension;
  objection_handling: ScoreDimension;
  value_prop: ScoreDimension;
  close: ScoreDimension;
};

export type CallMetrics = {
  rep_talk_ratio: number;
  longest_rep_monologue_secs: number;
  rep_questions: number;
  filler_words: number;
  first_objection_secs: number | null;
  rep_turns: number;
  prospect_turns: number;
  interruptions_by_rep: number;
};

export type TargetKind = "real" | "practice" | "boss";

export type ScoreMoment = {
  t_ms: number;
  label: string;
  kind: "good" | "missed";
}

type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  seat_limit: number;
  company_description: string | null;
  product_description: string | null;
  ideal_customer_profile: string | null;
  reps_see_team: boolean;
  trial_call_limit: number;
  trial_ends_at: string;
  trial_domain: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_interval: "month" | "quarter" | "year" | null;
  billing_currency: "usd" | "eur" | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};

export type BillingEvent = { id: string; type: string; received_at: string };
export type UsageEvent = {
  id: string;
  org_id: string;
  session_id: string | null;
  provider: "anthropic" | "elevenlabs";
  kind: "score" | "digest" | "voice";
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  seconds: number;
  cost_usd: number;
  created_at: string;
};
export type AdminAction = { id: string; admin_email: string; org_id: string | null; action: string; payload: Json | null; created_at: string };
export type Feedback = { id: string; org_id: string | null; user_id: string | null; email: string; name: string | null; role: string | null; page: string | null; user_agent: string | null; body: string; reply_ok: boolean; created_at: string };
export type EmailLog = { id: string; org_id: string; user_id: string | null; kind: string; sent_at: string };

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  /** When the rep confirmed the recording notice; null until their first call. */
  recording_ack_at: string | null;
  created_at: string;
}

export type CallComment = {
  id: string;
  session_id: string;
  org_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Membership = {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  manager_id: string | null;
  created_at: string;
}

export type Invite = {
  id: string;
  org_id: string;
  email: string;
  role: MemberRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type Target = {
  id: string;
  org_id: string;
  created_by: string | null;
  name: string;
  title: string;
  company: string;
  industry: string | null;
  company_size: string | null;
  persona_notes: string | null;
  pain_points: string[];
  objections: string[];
  voice_id: string | null;
  is_archived: boolean;
  kind: TargetKind;
  created_at: string;
  updated_at: string;
};

export type CallSession = {
  id: string;
  org_id: string;
  user_id: string;
  target_id: string | null;
  difficulty: Difficulty;
  status: SessionStatus;
  outcome: CallOutcome | null;
  elevenlabs_conversation_id: string | null;
  elevenlabs_agent_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  audio_path: string | null;
  error: string | null;
  outcome_reason: string | null;
  metrics: CallMetrics | null;
  prospect_summary: string | null;
  review_requested_at: string | null;
  review_skipped_at: string | null;
  prompt_hash: string | null;
  finalize_attempts: number;
  /** Set on every scoring claim; the sweep and the retry route judge staleness from it. */
  scoring_started_at: string | null;
  /** Mood id from src/lib/domain/moods.ts, rolled per call. */
  mood: string | null;
  /** Whether an assistant or receptionist answered before the prospect. */
  gatekeeper: boolean;
  created_at: string;
};

export type CallTranscript = {
  session_id: string;
  turns: TranscriptTurn[];
  full_text: string | null;
  created_at: string;
}

export type ScoreObjection = {
  kind: string;
  quote: string;
  t_ms: number;
  handled: "handled" | "partial" | "missed";
};

export type CallScore = {
  session_id: string;
  overall: number;
  dimensions: ScoreDimensions;
  strengths: string[];
  improvements: string[];
  coach_summary: string;
  moments: ScoreMoment[];
  objections: ScoreObjection[];
  model: string | null;
  created_at: string;
}

export type KnowledgeSource = {
  id: string;
  org_id: string;
  uploaded_by: string | null;
  name: string;
  kind: SourceKind;
  storage_path: string | null;
  raw_text: string | null;
  status: SourceStatus;
  summary: string | null;
  extracted: Json | null;
  error: string | null;
  created_at: string;
}

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Table<R, I, Rels extends Rel[] = []> = { Row: R; Insert: I; Update: Partial<I>; Relationships: Rels };

export type Database = {
  public: {
    Tables: {
      organizations: Table<
        Organization,
        Insert<Organization, "id" | "plan" | "seat_limit" | "company_description" | "product_description" | "ideal_customer_profile" | "reps_see_team" | "trial_call_limit" | "trial_ends_at" | "trial_domain" | "stripe_customer_id" | "stripe_subscription_id" | "stripe_price_id" | "billing_interval" | "billing_currency" | "subscription_status" | "current_period_end" | "cancel_at_period_end" | "created_at">
      >;
      billing_events: Table<BillingEvent, Insert<BillingEvent, "received_at">>;
      usage_events: Table<UsageEvent, Insert<UsageEvent, "id" | "session_id" | "model" | "input_tokens" | "output_tokens" | "cache_read_tokens" | "cache_write_tokens" | "seconds" | "cost_usd" | "created_at">>;
      admin_actions: Table<AdminAction, Insert<AdminAction, "id" | "org_id" | "payload" | "created_at">>;
      email_log: Table<EmailLog, Insert<EmailLog, "id" | "user_id" | "sent_at">>;
      feedback: Table<
        Feedback,
        Insert<Feedback, "id" | "org_id" | "user_id" | "name" | "role" | "page" | "user_agent" | "reply_ok" | "created_at">,
        [
          { foreignKeyName: "feedback_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "feedback_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      profiles: Table<Profile, Insert<Profile, "full_name" | "avatar_url" | "email" | "recording_ack_at" | "created_at">>;
      call_comments: Table<
        CallComment,
        Insert<CallComment, "id" | "created_at">,
        [
          { foreignKeyName: "call_comments_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "call_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "call_comments_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      memberships: Table<
        Membership,
        Insert<Membership, "id" | "role" | "manager_id" | "created_at">,
        [
          { foreignKeyName: "memberships_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "memberships_manager_id_fkey"; columns: ["manager_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      invites: Table<
        Invite,
        Insert<Invite, "id" | "role" | "token" | "invited_by" | "expires_at" | "accepted_at" | "created_at">,
        [
          { foreignKeyName: "invites_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "invites_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      targets: Table<
        Target,
        Insert<Target, "id" | "created_by" | "industry" | "company_size" | "persona_notes" | "pain_points" | "objections" | "voice_id" | "is_archived" | "kind" | "created_at" | "updated_at">,
        [
          { foreignKeyName: "targets_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "targets_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      call_sessions: Table<
        CallSession,
        Insert<CallSession, "id" | "target_id" | "status" | "outcome" | "elevenlabs_conversation_id" | "elevenlabs_agent_id" | "started_at" | "ended_at" | "duration_seconds" | "audio_path" | "error" | "outcome_reason" | "metrics" | "prospect_summary" | "review_requested_at" | "review_skipped_at" | "prompt_hash" | "finalize_attempts" | "scoring_started_at" | "mood" | "gatekeeper" | "created_at">,
        [
          { foreignKeyName: "call_sessions_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "call_sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "call_sessions_target_id_fkey"; columns: ["target_id"]; isOneToOne: false; referencedRelation: "targets"; referencedColumns: ["id"] },
        ]
      >;
      call_transcripts: Table<
        CallTranscript,
        Insert<CallTranscript, "turns" | "full_text" | "created_at">,
        [{ foreignKeyName: "call_transcripts_session_id_fkey"; columns: ["session_id"]; isOneToOne: true; referencedRelation: "call_sessions"; referencedColumns: ["id"] }]
      >;
      call_scores: Table<
        CallScore,
        Insert<CallScore, "strengths" | "improvements" | "moments" | "objections" | "model" | "created_at">,
        [{ foreignKeyName: "call_scores_session_id_fkey"; columns: ["session_id"]; isOneToOne: true; referencedRelation: "call_sessions"; referencedColumns: ["id"] }]
      >;
      knowledge_sources: Table<
        KnowledgeSource,
        Insert<KnowledgeSource, "id" | "uploaded_by" | "kind" | "storage_path" | "raw_text" | "status" | "summary" | "extracted" | "error" | "created_at">,
        [
          { foreignKeyName: "knowledge_sources_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "knowledge_sources_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      my_org_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      my_role: { Args: { p_org: string }; Returns: MemberRole };
      is_manager: { Args: { p_org: string }; Returns: boolean };
      create_organization: { Args: { p_name: string; p_slug: string; p_user_id: string; p_trial_domain: string | null }; Returns: string };
      accept_invite: { Args: { p_token: string }; Returns: string };
    };
    Enums: {
      member_role: MemberRole;
      difficulty: Difficulty;
      session_status: SessionStatus;
      call_outcome: CallOutcome;
      source_status: SourceStatus;
      source_kind: SourceKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
