// Cleaning for researched values. The old prospects sheet (and most club
// research spreadsheets) pack "nothing found" into the cell as prose:
// "Not published", "N/A (school program)", "Unknown". Those must become
// blanks, never a value that looks real.

const PLACEHOLDER = /^(?:not\s+(?:published|found|listed|known|available)|n\/?a|na|none|unknown|tbc|tba|tbd|vacant|nil|-+|—|–|\?+|x)(?=$|[^a-z0-9])/i;

/** True when a cell says "we looked and there's nothing here". */
export function isPlaceholder(v: string | null | undefined): boolean {
  const s = (v ?? "").trim();
  if (!s) return true;
  return PLACEHOLDER.test(s);
}

/** Trimmed cell value, or null for blanks and placeholder prose. */
export function cleanCell(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return isPlaceholder(s) ? null : s;
}

const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Every email address inside a cell ("a@x.com (club inbox)" → ["a@x.com"]). */
export function extractEmails(v: string | null | undefined): string[] {
  return [...new Set((v ?? "").match(EMAIL_RE) ?? [])];
}

export function normEmail(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Australian phone numbers to a comparable digit string:
 * "+61 412 345 678" / "0412 345 678" / "61412345678" → "0412345678".
 */
export function normPhone(v: string): string {
  let d = v.replace(/[^\d+]/g, "");
  if (d.startsWith("+61")) d = "0" + d.slice(3);
  else if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  return d.replace(/\D/g, "");
}

/** Phone-number-looking runs inside a cell. */
export function extractPhones(v: string | null | undefined): string[] {
  const s = v ?? "";
  const runs = s.match(/(?:\+?61[\s-]?|0)[2-478](?:[\s-]?\d){8}/g) ?? [];
  return [...new Set(runs.map((r) => r.trim()))];
}

/** Lower-case host + path without scheme / www / trailing slash. */
export function normUrl(v: string | null | undefined): string {
  return (v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/** Make a stored URL clickable. */
export function hrefFor(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Person-name key for duplicate checks: lower case, no punctuation. */
export function normPersonName(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/[-']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Today's date as YYYY-MM-DD in local time (not UTC, which rolls early in Sydney). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Accepts 2026-03-01, 1/3/2026, 01/03/26 (AU day-first). Null if unparseable. */
export function parseDateCell(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}
