"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatAud,
  includesToText,
  parseIncludesText,
  parsePricingText,
  pricingToText,
  type ProposalRow,
} from "@/lib/proposals";

/**
 * The "Proposal" section of the prospect drawer.
 *
 * Lists the prospect's proposals with their status, link and acceptance
 * record; creates and edits one with a short form (one item per line for
 * inclusions and pricing); attaches the designed PDF; marks it sent.
 * Accepting happens on the public page — see app/proposal/[token].
 */
const inputClass =
  "w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-gold";

type Draft = {
  title: string;
  headline: string;
  intro: string;
  includesText: string;
  pricingText: string;
  terms: string;
  valid_until: string;
  pdf_url: string;
};

const EMPTY: Draft = {
  title: "",
  headline: "",
  intro: "",
  includesText: "",
  pricingText: "",
  terms: "",
  valid_until: "",
  pdf_url: "",
};

function draftFrom(p: ProposalRow): Draft {
  return {
    title: p.title,
    headline: p.headline ?? "",
    intro: p.intro ?? "",
    includesText: includesToText(p.includes),
    pricingText: pricingToText(p.pricing),
    terms: p.terms ?? "",
    valid_until: p.valid_until ?? "",
    pdf_url: p.pdf_url ?? "",
  };
}

const STATUS_STYLE: Record<ProposalRow["status"], string> = {
  draft: "bg-black/5 text-[#6e6e73]",
  sent: "bg-amber-100 text-amber-800",
  viewed: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
};

function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

export function ProposalPanel({ prospectId, clubName }: { prospectId: string; clubName: string }) {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/list?prospectId=${encodeURIComponent(prospectId)}`, { cache: "no-store" });
      const j = (await res.json()) as { proposals?: ProposalRow[]; error?: string };
      if (!res.ok) throw new Error(j.error || `List failed (${res.status})`);
      setRows(j.proposals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load proposals");
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function payload(d: Draft) {
    return {
      title: d.title,
      headline: d.headline,
      intro: d.intro,
      includes: parseIncludesText(d.includesText),
      pricing: parsePricingText(d.pricingText),
      terms: d.terms,
      valid_until: d.valid_until,
      pdf_url: d.pdf_url,
    };
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const isNew = editingId === "new";
      const res = await fetch(isNew ? "/api/proposals/create" : `/api/proposals/${editingId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(draft), ...(isNew ? { prospect_id: prospectId, club_name: clubName } : {}) }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || `Save failed (${res.status})`);
      setEditingId(null);
      setDraft(EMPTY);
      await load();
      flash(isNew ? "Proposal created as a draft. Mark it sent when you share the link." : "Proposal saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(p: ProposalRow, status: ProposalRow["status"]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || `Update failed (${res.status})`);
      await load();
      flash(status === "sent" ? "Marked sent. The link is live." : "Updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: ProposalRow) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${p.id}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || `Delete failed (${res.status})`);
      await load();
      flash("Draft deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPdf(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/upload-pdf?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error || `Upload failed (${res.status})`);
      setDraft((d) => ({ ...d, pdf_url: j.url! }));
      flash("PDF attached. Save to keep it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload");
    } finally {
      setBusy(false);
    }
  }

  function linkFor(p: ProposalRow): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/proposal/${p.token}`;
  }

  async function copyLink(p: ProposalRow) {
    try {
      await navigator.clipboard.writeText(linkFor(p));
      flash("Link copied.");
    } catch {
      flash(linkFor(p));
    }
  }

  const form = editingId ? (
    <div className="mt-3 rounded-lg border border-black/10 bg-[#fafafa] p-4">
      <div className="grid gap-3">
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Title
          <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Sideline Pro for Queenscliff Netball Club" />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Headline
          <input className={inputClass} value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} placeholder="One sentence on what the club gets." />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Intro
          <textarea rows={4} className={inputClass} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} placeholder="Two or three short paragraphs. Blank line between paragraphs." />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          What&rsquo;s included (one per line, &ldquo;Title — detail&rdquo;)
          <textarea rows={5} className={inputClass + " font-mono text-[12px]"} value={draft.includesText} onChange={(e) => setDraft({ ...draft, includesText: e.target.value })} placeholder={"Club website — public site with draws, results, news and registration\nMember app — iOS and Android, wet-weather calls and team chat\nUmpire rostering — assignments, confirmations and pay export"} />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Pricing (one per line, &ldquo;Label | dollars | once/month/year/season | note&rdquo;)
          <textarea rows={4} className={inputClass + " font-mono text-[12px]"} value={draft.pricingText} onChange={(e) => setDraft({ ...draft, pricingText: e.target.value })} placeholder={"Platform licence | 3000 | year | includes hosting and support\nSetup and migration | 1500 | once"} />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
          Terms
          <textarea rows={4} className={inputClass} value={draft.terms} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} placeholder="Start date, billing, cancellation, who owns the data." />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
            Valid until
            <input type="date" className={inputClass} value={draft.valid_until} onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
            Designed PDF
            <input
              type="file"
              accept="application/pdf"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPdf(f);
              }}
            />
            {draft.pdf_url ? (
              <a href={draft.pdf_url} target="_blank" rel="noopener noreferrer" className="truncate text-[11px] normal-case tracking-normal text-gold underline">
                {draft.pdf_url.split("/").pop()}
              </a>
            ) : null}
          </label>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !draft.title.trim()} className="rounded-md gold-bg px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : editingId === "new" ? "Create draft" : "Save proposal"}
        </button>
        <button type="button" onClick={() => { setEditingId(null); setDraft(EMPTY); }} className="text-xs uppercase tracking-wider text-[#6e6e73] hover:text-[#1d1d1f]">
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div>
      {notice ? <p className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p> : null}
      {error ? <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : null}

      {loading ? (
        <p className="text-xs text-[#86868b]">Loading proposals…</p>
      ) : rows.length === 0 && !editingId ? (
        <p className="text-xs text-[#86868b]">No proposal yet. Create one, mark it sent, and share the link.</p>
      ) : null}

      <ul className="divide-y divide-black/5">
        {rows.map((p) => (
          <li key={p.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#86868b]">
                  {p.pricing.length > 0 ? `${p.pricing.map((l) => `${l.label} ${formatAud(l.amount_cents)}`).join(" · ")} · ` : ""}
                  {p.sent_at ? `sent ${when(p.sent_at)}` : "not sent"}
                  {p.first_viewed_at ? ` · first opened ${when(p.first_viewed_at)} (${p.view_count} views)` : ""}
                </div>
                {p.status === "accepted" ? (
                  <div className="mt-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    ✓ Accepted {when(p.accepted_at)} by <b>{p.accepted_name}</b> ({p.accepted_role}, {p.accepted_email})
                    {p.accepted_note ? <div className="mt-1 italic">&ldquo;{p.accepted_note}&rdquo;</div> : null}
                  </div>
                ) : null}
                {p.status === "declined" ? (
                  <div className="mt-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-900">
                    Declined {when(p.declined_at)}{p.declined_reason ? `: “${p.declined_reason}”` : "."}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => void copyLink(p)} className="rounded border border-black/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold">
                  Copy link
                </button>
                <a href={linkFor(p)} target="_blank" rel="noopener noreferrer" className="rounded border border-black/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold">
                  Open ↗
                </a>
                {p.status === "draft" ? (
                  <button type="button" onClick={() => void setStatus(p, "sent")} disabled={busy} className="rounded gold-bg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50">
                    Mark sent
                  </button>
                ) : null}
                {p.status !== "accepted" ? (
                  <button type="button" onClick={() => { setEditingId(p.id); setDraft(draftFrom(p)); }} className="rounded border border-black/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold">
                    Edit
                  </button>
                ) : null}
                {p.status === "draft" ? (
                  <button type="button" onClick={() => void remove(p)} disabled={busy} className="rounded border border-black/10 px-2 py-1 text-[10px] uppercase tracking-wider text-rose-700 hover:border-rose-300">
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
            {editingId === p.id ? form : null}
          </li>
        ))}
      </ul>

      {editingId === "new" ? form : (
        <button
          type="button"
          onClick={() => { setEditingId("new"); setDraft(EMPTY); }}
          className="mt-3 rounded-md border border-black/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold"
        >
          + New proposal
        </button>
      )}
      <p className="mt-2 text-[10px] text-[#86868b]">
        The link only works once the proposal is marked sent. Accepting on the page moves this prospect to Won and
        emails you.
      </p>
    </div>
  );
}
