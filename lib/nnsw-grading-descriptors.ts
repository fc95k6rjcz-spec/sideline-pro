/**
 * Netball NSW / Netball Australia grading descriptors, mapped to the eight
 * MWNA competencies the coach's report scores 1–5.
 *
 * Source: Netball Australia "Netball Skills Development Framework"
 * (https://netball.com.au/sites/default/files/2019-06/NetballSkillsDevelopmentFramework_UpdatedFINAL_Sept2018.pdf)
 * — the same five-stage progression NNSW references in its junior grading
 * guidance. We anchor our 1–5 to the framework's Development band (11–13yrs)
 * because that is where the bulk of MWNA Saturday grades sit; rather than
 * trying to import every age band verbatim, each 1–5 step describes what
 * "around the middle of this team's grade" looks like at that stage.
 *
 * Coaches see these in two places in the mobile coach's report:
 *  1. A top-of-form expandable "NNSW grading guide" summarising the stages.
 *  2. A per-competency "What does a 3 look like?" disclosure so the coach
 *     can sanity-check a tap against the framework language without leaving
 *     the form.
 *
 * Keep descriptors short (one sentence each) — coaches will read these
 * courtside between quarters, not study them.
 */

import type { MwnaCompetencyId } from "@/lib/mwna-competencies";

export type NnswLevelDescriptor = {
  /** Plain-English label for the level — shown alongside the number. */
  label: string;
  /** Single sentence describing what this score looks like in play. */
  description: string;
};

export type NnswCompetencyDescriptors = Record<1 | 2 | 3 | 4 | 5, NnswLevelDescriptor>;

/**
 * NNSW / Netball Australia five-stage pathway, summarised for the top-of-form
 * reference card. Coaches mostly grade at Foundation→Development; Intermediate
 * and above are included so coaches assessing an early-developing player have
 * the next-stage language to hand.
 */
export const NNSW_FRAMEWORK_STAGES: ReadonlyArray<{
  name: string;
  ageRange: string;
  summary: string;
}> = [
  {
    name: "Foundation (NetSetGO)",
    ageRange: "5–10 yrs",
    summary:
      "Building basic movement (balance, pivot, sprint), chest/shoulder pass, straight leads, shadow defence and a basic shooting action.",
  },
  {
    name: "Development",
    ageRange: "11–13 yrs",
    summary:
      "Combining lead-pivot-pass into court play, bounce passes and lobs under pressure, double dodges and split/re-offer, one-on-one defence with hands over the ball.",
  },
  {
    name: "Intermediate",
    ageRange: "14–15 yrs",
    summary:
      "Reading the play, timing leads, holding and front-cutting against contested defence, three phases of defence, defending shots with two hands.",
  },
  {
    name: "Advanced",
    ageRange: "16–17 yrs",
    summary:
      "Feeding shooters at speed, applying screens and resets, double defence, area defence concepts, defending the shot with positioning and timing.",
  },
  {
    name: "Elite",
    ageRange: "17+ yrs",
    summary:
      "Full application of attacking/defensive units, area defence (box, diamond, triangle), advanced ball control on either side, off-line defence.",
  },
];

const STRENGTH_TAGS = {
  1: { label: "Emerging", description: "Just starting to show this skill — needs ongoing direction." },
  2: { label: "Developing", description: "Inconsistent — shows it in drills, less so under game pressure." },
  3: { label: "Sound", description: "Reliable for this grade — does it the right way most of the time." },
  4: { label: "Strong", description: "Above the middle of this grade — a coach can lean on it in tight games." },
  5: { label: "Standout", description: "Top end of the grade — capable of contributing at a level up." },
} as const satisfies Record<1 | 2 | 3 | 4 | 5, NnswLevelDescriptor>;

/**
 * Generic 1–5 framing reused as a fallback for any competency we haven't
 * authored bespoke descriptors for. Coaches still get the strength tag and
 * a usable sentence rather than a blank tooltip.
 */
export const NNSW_GENERIC_LEVELS: NnswCompetencyDescriptors = STRENGTH_TAGS;

/**
 * Per-competency descriptors keyed by MWNA competency id. Each level's
 * description should describe an observable behaviour — what the coach
 * would actually see on court — using NNSW framework language where
 * applicable.
 */
export const NNSW_COMPETENCY_LEVELS: Record<MwnaCompetencyId, NnswCompetencyDescriptors> = {
  ball_handling: {
    1: {
      label: "Emerging",
      description: "Drops or loses control of chest passes and basic catches under pressure.",
    },
    2: {
      label: "Developing",
      description: "Catches a clean chest/shoulder pass but fumbles bounce passes, lobs or one-handed catches.",
    },
    3: {
      label: "Sound",
      description: "Catches chest, shoulder, bounce and lob cleanly; uses ball on either side when stationary.",
    },
    4: {
      label: "Strong",
      description: "Confident one-handed catches high and low, secure use of ball on either side of the body.",
    },
    5: {
      label: "Standout",
      description: "Hooks high balls in, takes hard one-handers under contact, releases cleanly from any point of catch.",
    },
  },
  passing_decision_making: {
    1: {
      label: "Emerging",
      description: "Tends to pass to the nearest option without scanning, often turning the ball over.",
    },
    2: {
      label: "Developing",
      description: "Picks the right pass when unpressured; under defence reverts to safe short balls.",
    },
    3: {
      label: "Sound",
      description: "Times release of the pass to the lead, uses bounce/lob when called for, mostly chooses the better option.",
    },
    4: {
      label: "Strong",
      description: "Plays give-and-go, fakes and step-arounds; sees the second-pass option before catching.",
    },
    5: {
      label: "Standout",
      description: "Drives play with vision and variety — hits cutting leads, splits double defence, switches direction of attack.",
    },
  },
  footwork_movement: {
    1: {
      label: "Emerging",
      description: "Footwork breaks frequently on the catch; slow to recover after landing.",
    },
    2: {
      label: "Developing",
      description: "Lands and pivots legally most of the time but loses balance on a hard catch or quick change of direction.",
    },
    3: {
      label: "Sound",
      description: "Pivots inside and outside cleanly, changes pace and direction, lands and balances on either foot.",
    },
    4: {
      label: "Strong",
      description: "Quick feet under pressure, uses shuffle/slip steps to reposition, decelerates safely from a sprint.",
    },
    5: {
      label: "Standout",
      description: "Turns in the air on the catch, applies movement skills creatively across the court, dictates contests with footwork.",
    },
  },
  defensive_pressure: {
    1: {
      label: "Emerging",
      description: "Ball-watches rather than tracking their player; rarely gets hands over.",
    },
    2: {
      label: "Developing",
      description: "Marks one-on-one and gets to the 0.9m mark on the ball but doesn't dictate the pass.",
    },
    3: {
      label: "Sound",
      description: "Applies first-ball pressure, hands over to dictate pass type or direction, contests the front and the side.",
    },
    4: {
      label: "Strong",
      description: "Reads the play to intercept, defends from behind as well as front/side, denies space rather than just chasing it.",
    },
    5: {
      label: "Standout",
      description: "Dictates phases of defence consistently, defends the shot with two hands and jump, sets up rebounds.",
    },
  },
  game_awareness: {
    1: {
      label: "Emerging",
      description: "Tends to drift out of position or chase the ball; limited sense of where teammates are.",
    },
    2: {
      label: "Developing",
      description: "Stays in position but reacts to the play rather than anticipating it.",
    },
    3: {
      label: "Sound",
      description: "Recognises space and moves into it, repositions after delivery, reads obvious body cues.",
    },
    4: {
      label: "Strong",
      description: "Times leads to the feeder, uses triangles/swing to reset, picks the contested vs free option correctly.",
    },
    5: {
      label: "Standout",
      description: "Reads the game one phase ahead — sets up screens, manages tempo, organises teammates around them.",
    },
  },
  communication_teamwork: {
    1: {
      label: "Emerging",
      description: "Quiet on court; rarely calls for the ball or talks defenders through switches.",
    },
    2: {
      label: "Developing",
      description: "Calls for own pass when free; less reliable at calling switches or warning teammates.",
    },
    3: {
      label: "Sound",
      description: "Audible calls for the ball, talks through defensive switches, encourages teammates.",
    },
    4: {
      label: "Strong",
      description: "Organises others — directs leads, calls the shape at centre passes, lifts the group's energy.",
    },
    5: {
      label: "Standout",
      description: "Effectively a court captain; runs the unit on attack or defence, settles teammates when momentum shifts.",
    },
  },
  coachability_attitude: {
    1: {
      label: "Emerging",
      description: "Disengages from feedback or struggles to apply it next time on court.",
    },
    2: {
      label: "Developing",
      description: "Listens to feedback but applies it inconsistently; effort dips when the game gets hard.",
    },
    3: {
      label: "Sound",
      description: "Tries the change asked for in the next quarter, maintains effort across the game.",
    },
    4: {
      label: "Strong",
      description: "Actively seeks feedback, brings consistent intensity, lifts teammates when things aren't going well.",
    },
    5: {
      label: "Standout",
      description: "Applies feedback immediately, leads by example in effort and behaviour, helps run training drills.",
    },
  },
  positional_suitability: {
    1: {
      label: "Emerging",
      description: "Best position is unclear — struggling to find a role that suits their current skills.",
    },
    2: {
      label: "Developing",
      description: "Has a position they can cover but limited at the demands of any single role at this grade.",
    },
    3: {
      label: "Sound",
      description: "Reliable in one or two positions that suit them — fits the team shape comfortably.",
    },
    4: {
      label: "Strong",
      description: "Multi-positional — could anchor more than one position at this grade and adapt mid-game.",
    },
    5: {
      label: "Standout",
      description: "Court-wide flexibility; coach can play them anywhere as the game demands and trust the standard.",
    },
  },
};

/** Lookup helper — falls back to the generic 1–5 framing if a competency
 *  isn't in the bespoke map (defensive only; today every id is covered). */
export function getNnswLevelDescriptors(id: MwnaCompetencyId): NnswCompetencyDescriptors {
  return NNSW_COMPETENCY_LEVELS[id] ?? NNSW_GENERIC_LEVELS;
}

/** Short framing line shown above the descriptors in the per-competency
 *  disclosure — reminds coaches they're scoring relative to their own grade. */
export const NNSW_RELATIVE_TO_GRADE_HINT =
  "Score relative to the middle of THIS team's grade, not the whole age group.";

/** One-line intro for the top-of-form reference card. */
export const NNSW_REFERENCE_INTRO =
  "Netball NSW grading draws on Netball Australia's Skills Development Framework — five progressive stages from NetSetGO to Elite. Use the stage your players are working through as the benchmark for what a 3 should look like.";

