/**
 * Manly Warringah / club competency framework shared by grading-day and coach season assessments.
 *
 * Grading UI keeps six legacy skill columns in `assessments`; each maps to one competency id below.
 * Coach season assessments store all eight competency ids in `coach_competency_assessments.competency_scores` (JSON).
 */

export const MWNA_COMPETENCIES = [
  {
    id: "ball_handling",
    label: "Ball handling",
    shortLabel: "Ball handling",
  },
  {
    id: "passing_decision_making",
    label: "Passing / decision making",
    shortLabel: "Passing / decisions",
  },
  {
    id: "footwork_movement",
    label: "Footwork / movement",
    shortLabel: "Footwork / movement",
  },
  {
    id: "defensive_pressure",
    label: "Defensive pressure",
    shortLabel: "Defensive pressure",
  },
  {
    id: "game_awareness",
    label: "Game awareness",
    shortLabel: "Game awareness",
  },
  {
    id: "communication_teamwork",
    label: "Communication / teamwork",
    shortLabel: "Communication",
  },
  {
    id: "coachability_attitude",
    label: "Coachability / attitude",
    shortLabel: "Coachability",
  },
  {
    id: "positional_suitability",
    label: "Positional suitability",
    shortLabel: "Position fit",
  },
] as const;

export type MwnaCompetencyId = (typeof MWNA_COMPETENCIES)[number]["id"];

export const MWNA_COMPETENCY_IDS = MWNA_COMPETENCIES.map((c) => c.id) as readonly MwnaCompetencyId[];

const COMPETENCY_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  MWNA_COMPETENCIES.map((c) => [c.id, c.label])
);

export function mwnaCompetencyLabel(id: string): string {
  return COMPETENCY_LABEL_BY_ID[id] ?? id;
}

/** Grading tool skill title → MWNA competency id (six legacy fields). */
export const GRADING_SKILL_TO_COMPETENCY_ID: Record<string, MwnaCompetencyId> = {
  Footwork: "footwork_movement",
  "Ball Handling": "ball_handling",
  "Attacking Play": "passing_decision_making",
  "Defensive Skills": "defensive_pressure",
  "Game Sense": "game_awareness",
  Attitude: "coachability_attitude",
};

/** `assessments` column → competency id (for server-side baseline reads). */
export const GRADING_DB_COLUMN_TO_COMPETENCY_ID: Record<string, MwnaCompetencyId> = {
  footwork: "footwork_movement",
  ball_handling: "ball_handling",
  attacking_play: "passing_decision_making",
  defensive_skills: "defensive_pressure",
  game_sense: "game_awareness",
  attitude: "coachability_attitude",
};

export function isMwnaCompetencyId(s: string): s is MwnaCompetencyId {
  return (MWNA_COMPETENCY_IDS as readonly string[]).includes(s);
}

/** Parse and clamp competency_scores JSON to known keys, 1–5. */
export function normalizeCompetencyScores(raw: unknown): Partial<Record<MwnaCompetencyId, number>> {
  if (raw == null || typeof raw !== "object") return {};
  const out: Partial<Record<MwnaCompetencyId, number>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isMwnaCompetencyId(k)) continue;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    if (!Number.isFinite(n)) continue;
    const clamped = Math.max(1, Math.min(5, Math.round(n)));
    out[k] = clamped;
  }
  return out;
}

/** Highlight when grader and coach numeric ratings differ by this much or more. */
export const GRADER_COACH_DISAGREE_DELTA = 2;

export type CoachScoreTone = "strength" | "concern" | "neutral";

export function coachScoreTone(score: number): CoachScoreTone {
  if (score >= 4) return "strength";
  if (score <= 2) return "concern";
  return "neutral";
}

