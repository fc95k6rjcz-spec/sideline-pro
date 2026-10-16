import { ROLES } from "./constants";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Each role's synonyms, longest first, compiled once as whole-word patterns
// so "IT" matches "IT officer" but not "Fitness".
const MATCHERS = ROLES.filter((r) => r.synonyms.length).map((r) => ({
  key: r.key,
  patterns: [...r.synonyms]
    .sort((a, b) => b.length - a.length)
    .map((s) => new RegExp(`(^|[^a-z])${escapeRe(s.trim())}(?=$|[^a-z])`, "i")),
}));

/**
 * Every standard role a club's own title covers, in ROLES order.
 * "Secretary / Treasurer" → ["treasurer", "secretary"]
 * "Vice President"        → ["vice_president"]   (not also "president")
 * "Umpire Convenor"       → ["umpire_coordinator"]
 * Unrecognised titles come back as ["other"].
 */
export function categoriseTitle(title: string | null | undefined): string[] {
  let rest = ` ${(title ?? "").toLowerCase().replace(/[_/&,+|-]+/g, " ")} `;
  if (!rest.trim()) return [];
  const found: string[] = [];
  for (const m of MATCHERS) {
    for (const re of m.patterns) {
      const hit = rest.match(re);
      if (hit) {
        found.push(m.key);
        // Blank out what matched so "vice president" can't also count
        // as "president" further down the list.
        rest = rest.replace(re, (whole, lead: string) => lead + " ".repeat(whole.length - lead.length));
        break;
      }
    }
  }
  return found.length ? found : ["other"];
}

/** The single best category for a title (first match). */
export function categoriseRole(title: string | null | undefined): string {
  return categoriseTitle(title)[0] ?? "other";
}

/**
 * Does an appointment match a free-text role search? The query is
 * categorised the same way titles are, so "umpire coordinator" finds an
 * appointment titled "Umpire Convenor" or just "Umpires". Falls back to a
 * plain substring match on the club's own title.
 */
export function roleMatchesQuery(
  query: string,
  appt: { role_category: string; original_title: string | null },
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const cats = categoriseTitle(q).filter((c) => c !== "other");
  if (cats.length && cats.includes(appt.role_category)) return true;
  return (appt.original_title ?? "").toLowerCase().includes(q);
}
