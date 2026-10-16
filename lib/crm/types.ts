// Row shapes for the crm_* tables (see sql/crm_schema.sql) plus the
// snapshot the admin UI works from.

export type Verification = "verified" | "unverified" | "suggested";

export type StageKey =
  | "needs_research"
  | "ready"
  | "contacted"
  | "engaged"
  | "demo_booked"
  | "proposal"
  | "won"
  | "lost"
  | "nurture";

export type Sourced = {
  source_url: string | null;
  source_note: string | null;
  verified_on: string | null; // YYYY-MM-DD
};

export type Association = Sourced & {
  id: string;
  name: string;
  short_name: string | null;
  sport: string;
  state: string;
  region: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Club = Sourced & {
  id: string;
  name: string;
  aliases: string[];
  sport: string;
  suburb: string | null;
  region: string | null;
  state: string;
  website: string | null;
  social_links: Record<string, string>;
  approx_players: string | null;
  approx_teams: number | null;
  current_systems: string | null;
  paid_umpires: string | null;
  stage: StageKey;
  owner: string | null;
  feature_interest: string[];
  pain_points: string | null;
  demo_on: string | null;
  proposal_status: string | null;
  delay_reason: string | null;
  loss_reason: string | null;
  notes: string | null;
  legacy_prospect_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ClubAssociation = Sourced & {
  club_id: string;
  association_id: string;
  verification: Verification;
};

export type ChampionStatus = "none" | "potential" | "confirmed";

export type Person = Sourced & {
  id: string;
  full_name: string;
  preferred_name: string | null;
  location: string | null;
  linkedin_url: string | null;
  employer: string | null;
  job_title: string | null;
  industry: string | null;
  background_tags: string[];
  professional_source: string | null;
  professional_verified_on: string | null;
  champion_status: ChampionStatus;
  preferred_channel: string | null;
  do_not_contact: boolean;
  unsubscribed_at: string | null;
  notes: string | null;
  verification: Verification;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = "current" | "former" | "unverified" | "vacant";

export type Appointment = Sourced & {
  id: string;
  club_id: string;
  person_id: string | null;
  role_category: string;
  original_title: string | null;
  responsibilities: string | null;
  status: AppointmentStatus;
  season: string | null;
  started_on: string | null;
  ended_on: string | null;
  purchase_roles: string[];
  replaced_by_id: string | null;
  notes: string | null;
  verification: Verification;
  created_at: string;
  updated_at: string;
};

export type InboxType = "personal" | "role" | "general" | "work";

export type ContactPoint = Sourced & {
  id: string;
  person_id: string | null;
  club_id: string | null;
  kind: "email" | "phone";
  value: string;
  value_norm: string;
  inbox_type: InboxType;
  role_category: string | null;
  label: string | null;
  status: "active" | "bounced" | "invalid" | "stale";
  outreach_ok: boolean;
  verification: Verification;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: string;
  club_id: string;
  person_ids: string[];
  kind: "email" | "call" | "meeting" | "note" | "demo" | "proposal" | "stage_change";
  direction: "outbound" | "inbound" | null;
  outcome: string | null;
  occurred_at: string;
  subject: string | null;
  body: string | null;
  feature_interest: string[];
  pain_points: string | null;
  created_by_email: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  club_id: string;
  person_id: string | null;
  title: string;
  due_on: string | null;
  owner: string | null;
  status: "open" | "done" | "cancelled";
  completed_at: string | null;
  created_by_email: string | null;
  created_at: string;
};

/** Lightweight activity row shipped in the snapshot (no bodies). */
export type ActivityLite = Pick<
  Activity,
  "id" | "club_id" | "person_ids" | "kind" | "direction" | "outcome" | "occurred_at"
>;

export type Suppression = {
  email_norm: string;
  reason: string;
};

export type SavedAudience = {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  created_at: string;
};

/** Everything the board, tables, directory and audience builder need. */
export type Snapshot = {
  associations: Association[];
  clubs: Club[];
  clubAssociations: ClubAssociation[];
  people: Person[];
  appointments: Appointment[];
  contactPoints: ContactPoint[];
  tasks: Task[]; // open tasks only
  activities: ActivityLite[];
  suppressions: Suppression[];
  audiences: SavedAudience[];
};
