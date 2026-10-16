import type { StageKey } from "./types";

// ---------- pipeline ----------

export type StageDef = {
  key: StageKey;
  label: string;
  /** Tailwind classes for the chip / card accent. */
  chip: string;
  bar: string; // left border colour on cards
  open: boolean; // still being worked
};

// Colours run cool → warm → green as a club moves forward; closed-out
// stages (lost, nurture) go grey so the eye skips them.
export const STAGES: StageDef[] = [
  { key: "needs_research", label: "Needs research", chip: "bg-[#EEF0F3] text-[#5A5A5F]", bar: "border-l-[#B9BCC2]", open: true },
  { key: "ready", label: "Ready for outreach", chip: "bg-[#E6EEF9] text-[#2D5DA8]", bar: "border-l-[#5B8BD9]", open: true },
  { key: "contacted", label: "Contacted", chip: "bg-[#FDF1E0] text-[#9A6A1A]", bar: "border-l-[#E0A82E]", open: true },
  { key: "engaged", label: "Engaged", chip: "bg-[#FBE7D2] text-[#A4531A]", bar: "border-l-[#E0782E]", open: true },
  { key: "demo_booked", label: "Demo booked", chip: "bg-[rgba(189,138,44,0.16)] text-[#8A6418]", bar: "border-l-[#BD8A2C]", open: true },
  { key: "proposal", label: "Proposal", chip: "bg-[#EFE5F8] text-[#6B3FA0]", bar: "border-l-[#8E5CC9]", open: true },
  { key: "won", label: "Won", chip: "bg-[#E7F6EE] text-[#1B7A47]", bar: "border-l-[#2E9E62]", open: false },
  { key: "nurture", label: "Nurture", chip: "bg-[#F0F0F2] text-[#6E6E73]", bar: "border-l-[#C7C7CC]", open: false },
  { key: "lost", label: "Lost", chip: "bg-[#F0F0F2] text-[#86868B]", bar: "border-l-[#D9D9DE]", open: false },
];

export const STAGE_BY_KEY: Record<StageKey, StageDef> = Object.fromEntries(
  STAGES.map((s) => [s.key, s]),
) as Record<StageKey, StageDef>;

export function stageDef(key: string | null | undefined): StageDef {
  return STAGE_BY_KEY[(key ?? "needs_research") as StageKey] ?? STAGES[0];
}

/** The stage's accent colour as a hex value (for inline bars). */
export function stageHex(key: string | null | undefined): string {
  return stageDef(key).bar.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#B9BCC2";
}

// ---------- committee roles ----------

export type RoleDef = {
  key: string;
  label: string;
  short: string; // one/two letters for the card dots
  priority: boolean;
  proposition: string | null;
  /** Lower-case fragments that identify this role in a club's own title. */
  synonyms: string[];
};

// Order matters twice: it is display order, and categoriseRole() tries the
// roles top to bottom, so the more specific titles come first ("vice
// president" before "president", "umpire" before "coach").
export const ROLES: RoleDef[] = [
  {
    key: "vice_president",
    label: "Vice president",
    short: "VP",
    priority: false,
    proposition: null,
    synonyms: ["vice president", "vice-president", "vp", "deputy president", "vice chair"],
  },
  {
    key: "president",
    label: "President",
    short: "P",
    priority: true,
    proposition: "Overall club management, volunteer workload and purchasing approval",
    synonyms: ["president", "chair", "chairperson", "chairman", "chairwoman"],
  },
  {
    key: "treasurer",
    label: "Treasurer",
    short: "T",
    priority: true,
    proposition: "Digitised registrations, payments, financial reporting and reconciliation",
    synonyms: ["treasurer", "finance", "financial officer", "bookkeeper", "accounts"],
  },
  {
    key: "umpire_coordinator",
    label: "Umpire convenor / coordinator",
    short: "U",
    priority: true,
    proposition: "Automated umpire rostering, availability, allocations and changes",
    synonyms: [
      "umpire", "umpires", "umpiring", "umpire convenor", "umpire convener",
      "umpire coordinator", "head umpire", "umpire director", "umpire manager",
      "umpire allocator", "umpire liaison",
    ],
  },
  {
    key: "secretary",
    label: "Secretary",
    short: "S",
    priority: true,
    proposition: "Administration, communication, registrations and committee coordination",
    synonyms: ["secretary", "club secretary", "public officer", "administrator", "admin officer"],
  },
  {
    key: "coaching_coordinator",
    label: "Coaching coordinator",
    short: "C",
    priority: true,
    proposition: "Player grading and coaching tools",
    synonyms: [
      "head coach", "coaching coordinator", "coaching convenor", "coach coordinator",
      "director of coaching", "coaching director", "player development", "development officer",
      "development coordinator", "grading", "coaching",
    ],
  },
  {
    key: "registrar",
    label: "Registrar",
    short: "R",
    priority: true,
    proposition: "Registrations, player records and payment administration",
    synonyms: ["registrar", "registration", "registrations", "membership", "member services"],
  },
  {
    key: "technology",
    label: "Technology / digital / comms",
    short: "IT",
    priority: true,
    proposition: "Potential implementation support and internal advocacy",
    synonyms: [
      "technology", "it", "it officer", "digital", "website", "web", "social media",
      "communications", "comms", "media", "marketing", "publicity",
    ],
  },
  {
    key: "team_coordinator",
    label: "Team / age-group coordinator",
    short: "TC",
    priority: false,
    proposition: null,
    synonyms: ["team coordinator", "age group", "junior coordinator", "senior coordinator", "net set go", "netsetgo"],
  },
  {
    key: "uniform",
    label: "Uniform / equipment",
    short: "Un",
    priority: false,
    proposition: null,
    synonyms: ["uniform", "equipment", "merchandise", "canteen"],
  },
  {
    key: "sponsorship",
    label: "Sponsorship / fundraising",
    short: "Sp",
    priority: false,
    proposition: null,
    synonyms: ["sponsor", "sponsorship", "fundraising", "grants"],
  },
  {
    key: "committee_member",
    label: "Committee member",
    short: "M",
    priority: false,
    proposition: null,
    synonyms: ["committee", "general member", "ordinary member", "member", "volunteer"],
  },
  {
    key: "other",
    label: "Other",
    short: "O",
    priority: false,
    proposition: null,
    synonyms: [],
  },
];

export const ROLE_BY_KEY: Record<string, RoleDef> = Object.fromEntries(
  ROLES.map((r) => [r.key, r]),
);

export const PRIORITY_ROLES = ROLES.filter((r) => r.priority);

export function roleLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return ROLE_BY_KEY[key]?.label ?? key;
}

// ---------- purchase involvement ----------

export const PURCHASE_ROLES = [
  { key: "decision_maker", label: "Decision-maker" },
  { key: "user_admin", label: "Feature user / admin" },
  { key: "champion", label: "Internal champion" },
  { key: "influencer", label: "Influencer" },
  { key: "unknown", label: "Unknown" },
] as const;

// ---------- professional background ----------

export const BACKGROUND_TAGS = [
  { key: "technology", label: "Technology / software / AI / digital" },
  { key: "finance", label: "Finance / accounting" },
  { key: "operations", label: "Operations / administration" },
  { key: "project_management", label: "Project management" },
  { key: "business_owner", label: "Business owner / leadership" },
  { key: "other", label: "Other" },
] as const;

// ---------- product features ----------

export const FEATURES = [
  { key: "umpire_rostering", label: "Umpire rostering" },
  { key: "registrations_payments", label: "Registrations & payments" },
  { key: "financial_reporting", label: "Financial reporting" },
  { key: "player_grading", label: "Player grading" },
  { key: "coaching_tools", label: "Coaching tools" },
  { key: "communications", label: "Club communications / app" },
  { key: "website", label: "Club website" },
] as const;

export const OWNERS = ["Justin", "Rowan"] as const;

export const ACTIVITY_KINDS = [
  { key: "email", label: "Email" },
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "demo", label: "Demo" },
  { key: "proposal", label: "Proposal" },
  { key: "note", label: "Note" },
] as const;

export const OUTCOMES = [
  { key: "no_response", label: "No response yet" },
  { key: "replied", label: "Replied" },
  { key: "left_message", label: "Left message" },
  { key: "connected", label: "Spoke / met" },
  { key: "interested", label: "Interested" },
  { key: "not_interested", label: "Not interested" },
  { key: "bounced", label: "Bounced" },
] as const;

/**
 * Committees in NSW netball turn over at AGMs, which mostly run from
 * late October through to February. Anything last checked before the
 * start of the current AGM season is due a re-check.
 */
export const AGM_SEASON_START_MONTH = 10; // October (1-based)
export const STALE_AFTER_DAYS = 365;
