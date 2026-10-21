/**
 * Proposals a club can read and accept online.
 *
 * A proposal is created against a prospect in /admin/prospects, gets a
 * link (`/proposal/<token>`), and the club's committee opens it, reads it
 * and presses "Accept this proposal". Accepting records who, when and from
 * where, flips the prospect to Won, and emails the founders.
 *
 * Content is structured rather than a blob so the page can render it well
 * on a phone and the acceptance record can quote exactly what was agreed
 * (title, items, pricing) at the time of acceptance.
 */

export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";

export type ProposalInclude = { title: string; detail?: string };

export type ProposalPeriod = "once" | "month" | "year" | "season";

export type ProposalPrice = {
  label: string;
  amount_cents: number;
  period?: ProposalPeriod;
  note?: string;
};

export type ProposalRow = {
  id: string;
  prospect_id: string | null;
  token: string;
  club_name: string;
  title: string;
  headline: string | null;
  intro: string | null;
  includes: ProposalInclude[];
  pricing: ProposalPrice[];
  terms: string | null;
  pdf_url: string | null;
  valid_until: string | null;
  status: ProposalStatus;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  accepted_at: string | null;
  accepted_name: string | null;
  accepted_role: string | null;
  accepted_email: string | null;
  accepted_note: string | null;
  accepted_ip: string | null;
  accepted_user_agent: string | null;
  declined_at: string | null;
  declined_reason: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;

  /**
   * Payment, kept SEPARATE from acceptance on purpose.
   *
   * A committee accepting is the legal record of who agreed and to what,
   * and it has to stand whether or not the money then arrives. BECS direct
   * debit signs a mandate today and can fail three business days later, so
   * one column could never honestly mean both.
   */
  stripe_customer_id: string | null;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  /**
   * `processing` is the one that matters: a mandate is signed and the funds
   * are in flight. Treating it as paid is how a club gets a welcome email
   * for a debit that later bounces.
   */
  payment_status: PaymentStatus;
  payment_method_kind: string | null;
  paid_at: string | null;
  payment_failed_at: string | null;
  payment_failure_reason: string | null;
  /** What Stripe actually took, not what the quote said. */
  amount_paid_cents: number | null;
};

export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed";

const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "processing", "paid", "failed"];

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as string[]).includes(v);
}

/** What the public page may see — no prospect id, no IP, no agent. */
export type PublicProposal = Pick<
  ProposalRow,
  | "token"
  | "club_name"
  | "title"
  | "headline"
  | "intro"
  | "includes"
  | "pricing"
  | "terms"
  | "pdf_url"
  | "valid_until"
  | "status"
  | "sent_at"
  | "accepted_at"
  | "accepted_name"
  | "accepted_role"
  | "declined_at"
>;

export const PROPOSAL_STATUSES: readonly ProposalStatus[] = ["draft", "sent", "viewed", "accepted", "declined"];

export function isProposalStatus(v: unknown): v is ProposalStatus {
  return typeof v === "string" && (PROPOSAL_STATUSES as readonly string[]).includes(v);
}

/**
 * 24 URL-safe characters; the link is the only secret. Web Crypto rather
 * than node:crypto because this module is shared with the client bundle
 * (the admin panel and the public accept form import its helpers), and the
 * production build fails on a `node:` import reached from the browser.
 */
export function newProposalToken(): string {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function toPublicProposal(row: ProposalRow): PublicProposal {
  return {
    token: row.token,
    club_name: row.club_name,
    title: row.title,
    headline: row.headline,
    intro: row.intro,
    includes: row.includes,
    pricing: row.pricing,
    terms: row.terms,
    pdf_url: row.pdf_url,
    valid_until: row.valid_until,
    status: row.status,
    sent_at: row.sent_at,
    accepted_at: row.accepted_at,
    accepted_name: row.accepted_name,
    accepted_role: row.accepted_role,
    declined_at: row.declined_at,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Tolerant parse of the jsonb columns — a bad row renders as empty, not a crash. */
export function parseIncludes(raw: unknown): ProposalInclude[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const title = str(o.title);
      if (!title) return null;
      const detail = str(o.detail);
      return detail ? { title, detail } : { title };
    })
    .filter((x): x is ProposalInclude => x != null);
}

export function parsePricing(raw: unknown): ProposalPrice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const label = str(o.label);
      const cents = Number(o.amount_cents);
      if (!label || !Number.isFinite(cents)) return null;
      const period = str(o.period);
      const note = str(o.note);
      const out: ProposalPrice = { label, amount_cents: Math.round(cents) };
      if (period === "once" || period === "month" || period === "year" || period === "season") out.period = period;
      if (note) out.note = note;
      return out;
    })
    .filter((x): x is ProposalPrice => x != null);
}

export function normaliseProposalRow(raw: Record<string, unknown>): ProposalRow {
  return {
    ...(raw as unknown as ProposalRow),
    includes: parseIncludes(raw.includes),
    pricing: parsePricing(raw.pricing),
    status: isProposalStatus(raw.status) ? raw.status : "draft",
    view_count: Number(raw.view_count ?? 0) || 0,
    /* Defaults so a row read before sql/proposal_payments.sql is applied
       still parses — the columns are simply absent, not wrong. */
    payment_status: isPaymentStatus(raw.payment_status) ? raw.payment_status : "unpaid",
    amount_paid_cents:
      raw.amount_paid_cents == null ? null : Number(raw.amount_paid_cents) || 0,
  };
}

/**
 * The admin form takes one line per item so a proposal can be typed in a
 * minute: "Club website — the Seaforth-style public site, hosted and kept up".
 */
export function parseIncludesText(text: string): ProposalInclude[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(.*?)\s+[—–-]\s+(.*)$/.exec(l);
      return m ? { title: m[1]!.trim(), detail: m[2]!.trim() } : { title: l };
    });
}

/** "Platform licence | 1500 | year | includes hosting" — amount in dollars. */
export function parsePricingText(text: string): ProposalPrice[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label = "", amount = "", period = "", ...rest] = l.split("|").map((s) => s.trim());
      const dollars = Number(amount.replace(/[^0-9.]/g, ""));
      const out: ProposalPrice = { label, amount_cents: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0 };
      const p = period.toLowerCase().replace(/^per\s+/, "");
      if (p === "once" || p === "month" || p === "year" || p === "season") out.period = p;
      const note = rest.join(" | ").trim();
      if (note) out.note = note;
      return out;
    })
    .filter((p) => p.label);
}

export function includesToText(items: ProposalInclude[]): string {
  return items.map((i) => (i.detail ? `${i.title} — ${i.detail}` : i.title)).join("\n");
}

export function pricingToText(items: ProposalPrice[]): string {
  return items
    .map((p) => [p.label, (p.amount_cents / 100).toFixed(2), p.period ?? "", p.note ?? ""].join(" | ").replace(/( \| )+$/, ""))
    .join("\n");
}

export function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(
    cents / 100,
  );
}

export function periodLabel(p: ProposalPeriod | undefined): string {
  switch (p) {
    case "month":
      return "per month";
    case "year":
      return "per year";
    case "season":
      return "per season";
    case "once":
      return "one-off";
    default:
      return "";
  }
}

/** True once the date has passed (Sydney calendar date). */
export function proposalExpired(validUntil: string | null, now = new Date()): boolean {
  if (!validUntil) return false;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now); // YYYY-MM-DD
  return validUntil < today;
}

export function formatProposalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00+10:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "long", year: "numeric" }).format(d);
}
