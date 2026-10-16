// Fuzzy club-name matching for import de-duplication.
//
// Adapted from LEX's lib/fuzzy.js (company names on directory boards vs
// stack plans). A research sheet writes "Queenscliff NC" or "Queenscliff
// Netball" where the CRM holds "Queenscliff Netball Club Inc."; exact
// matching would create a second Queenscliff. Same scoring and bands:
//
//   score ≥ HIGH  (0.87) → "high"  — almost certainly the same club
//   score ≥ MAYBE (0.62) → "maybe" — plausible; a person decides on import
//   below MAYBE          → no suggestion

// Words that say "this is a netball club" rather than which one.
const STOP = new Set([
  "netball", "club", "clubs", "nc", "inc", "incorporated", "association", "assoc",
  "sports", "sport", "sporting", "the", "and", "of", "ltd", "limited", "nsw", "sc", "nbc", "fc",
]);

export function clubTokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[.,/&'"()\-–—]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/** Classic Levenshtein similarity ratio, 0..1. */
export function levRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

function tokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) return levRatio(a, b) >= 0.8;
  return false;
}

/** Similarity between two club names, 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const A = clubTokens(a);
  const B = clubTokens(b);
  if (!A.length || !B.length) {
    // Names made only of stop words ("Netball Club") — compare raw.
    return levRatio((a || "").toLowerCase().trim(), (b || "").toLowerCase().trim());
  }
  const ja = A.join(" ");
  const jb = B.join(" ");
  if (ja === jb) return 1;

  const used = new Set<number>();
  let hits = 0;
  for (const t of A) {
    for (let i = 0; i < B.length; i++) {
      if (!used.has(i) && tokenEq(t, B[i])) {
        used.add(i);
        hits++;
        break;
      }
    }
  }
  const overlap = (2 * hits) / (A.length + B.length);
  let score = Math.max(overlap, levRatio(ja, jb));

  // Subset: every token of the shorter name appears in the longer one
  // ("Pittwater Peninsula" ⊆ "Pittwater Peninsula Netball Club"). Unlike
  // company names in LEX, one shared word is weak evidence for clubs: it is
  // usually the suburb, and a suburb can have several clubs ("Narrabeen"
  // vs "Narrabeen Youth Club"). So a one-word subset is only ever a maybe.
  const shortToks = A.length <= B.length ? A : B;
  if (hits === shortToks.length && hits > 0) {
    score = shortToks.length >= 2 ? Math.max(score, 0.9) : Math.min(Math.max(score, 0.72), 0.8);
  }
  return score;
}

export const HIGH = 0.87;
export const MAYBE = 0.62;

export type MatchBand = "exact" | "high" | "maybe";

export function matchBand(score: number): Exclude<MatchBand, "exact"> | null {
  if (score >= HIGH) return "high";
  if (score >= MAYBE) return "maybe";
  return null;
}

/**
 * Best match for `name` among `candidates`, checking each candidate's
 * name and aliases. Exact (case/space-insensitive) hits are reported as
 * "exact" so the importer can link them without asking.
 */
export function bestClubMatch<T extends { name: string; aliases?: string[] | null }>(
  name: string,
  candidates: T[],
): { match: T; score: number; band: MatchBand } | null {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  let best: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const names = [c.name, ...(c.aliases ?? [])];
    for (const n of names) {
      if (n.trim().toLowerCase().replace(/\s+/g, " ") === key) {
        return { match: c, score: 1, band: "exact" };
      }
      const s = nameSimilarity(name, n);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
  }
  const band = matchBand(bestScore);
  return best && band ? { match: best, score: bestScore, band } : null;
}
