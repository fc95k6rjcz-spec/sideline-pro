"use client";

import { useEffect, useState } from "react";
import { formatProposalDate, type PublicProposal } from "@/lib/proposals";

/**
 * "Accept this proposal" — the bottom of the public proposal page.
 *
 * Name, role, email and an "I'm authorised" tick; on submit the server
 * records the acceptance and this flips to the confirmation. A proposal
 * that is already accepted shows who accepted it and when. "Not right now"
 * takes an optional reason so the follow-up conversation starts informed.
 *
 * On mount it pings the public GET route once so the pipeline shows the
 * proposal as viewed — done here, not in the server page, so an email
 * client pre-fetching the link does not count as the committee reading it.
 */
const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-[15px] text-[#1d1d1f] outline-none transition focus:border-[#10b3a3] focus:ring-2 focus:ring-[#10b3a3]/20";

export function ProposalActions({ proposal: initial, expired }: { proposal: PublicProposal; expired: boolean }) {
  const [proposal, setProposal] = useState(initial);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    void fetch(`/api/proposals/public/${encodeURIComponent(initial.token)}`, { cache: "no-store" }).catch(() => {});
  }, [initial.token]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/public/${encodeURIComponent(proposal.token)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, email, note, agree }),
      });
      const j = (await res.json()) as { proposal?: PublicProposal; error?: string };
      if (!res.ok || !j.proposal) throw new Error(j.error || `Could not record your acceptance (${res.status})`);
      setProposal(j.proposal);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your acceptance");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/public/${encodeURIComponent(proposal.token)}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, name }),
      });
      const j = (await res.json()) as { proposal?: PublicProposal; error?: string };
      if (!res.ok || !j.proposal) throw new Error(j.error || `Could not send that (${res.status})`);
      setProposal(j.proposal);
      setDeclining(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setBusy(false);
    }
  }

  if (proposal.status === "accepted") {
    return (
      <section className="mt-8 rounded-2xl border border-[#10b3a3]/40 bg-[#e6fbf8] p-6 sm:p-8" aria-live="polite">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#10b3a3] text-lg font-bold text-white">
            ✓
          </span>
          <div>
            <h2 className="text-xl font-bold">Proposal accepted</h2>
            <p className="mt-1 text-[15px] text-[#3a3a3c]">
              Accepted by <b>{proposal.accepted_name}</b>
              {proposal.accepted_role ? ` (${proposal.accepted_role})` : ""} on {formatProposalDate(proposal.accepted_at)}.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#3a3a3c]">
              Thank you. Justin will be in touch within a business day to confirm next steps and the start date. A copy
              of this page is your record of what was agreed.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (proposal.status === "declined") {
    return (
      <section className="mt-8 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
        <h2 className="text-lg font-bold">Thanks for letting us know</h2>
        <p className="mt-2 text-sm text-[#3a3a3c]">
          We&rsquo;ve noted that now isn&rsquo;t the right time. If anything changes, this link still works and you can
          accept from here, or reply to the email you received.
        </p>
        <button
          type="button"
          onClick={() => setProposal({ ...proposal, status: "viewed" })}
          className="mt-4 text-sm font-semibold text-[#10b3a3] underline-offset-2 hover:underline"
        >
          Changed your mind? Accept this proposal
        </button>
      </section>
    );
  }

  return (
    <section id="accept" className="mt-8 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold">Accept this proposal</h2>
      <p className="mt-1 text-sm text-[#6e6e73]">
        Pressing accept tells us the club is going ahead on the terms above. We record your name, role and the time;
        there is nothing to print or sign.
      </p>
      {expired ? (
        <div className="mt-4 rounded-lg border border-[#dc2626]/30 bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
          This proposal passed its valid-until date on {formatProposalDate(proposal.valid_until)}. Email{" "}
          <a href="mailto:justin@sidelinepro.com.au" className="font-semibold underline">
            justin@sidelinepro.com.au
          </a>{" "}
          and we will refresh it.
        </div>
      ) : (
        <form onSubmit={accept} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Your name
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Your role at the club
              <input
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                placeholder="e.g. President, Treasurer"
                autoComplete="organization-title"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Anything to add? <span className="font-normal text-[#86868b]">(optional)</span>
            <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preferred start date, who else to loop in, questions…" />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#10b3a3]" required />
            <span>
              I&rsquo;m authorised to accept this proposal on behalf of <b>{proposal.club_name}</b>, and the club agrees to
              the pricing and terms shown on this page.
            </span>
          </label>
          {error ? (
            <div role="alert" className="rounded-lg border border-[#dc2626]/30 bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
              {error}
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !agree}
              className="inline-flex items-center justify-center rounded-lg bg-[#10b3a3] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#0d9a8c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Recording…" : "Accept this proposal"}
            </button>
            {!declining ? (
              <button type="button" onClick={() => setDeclining(true)} className="text-sm text-[#6e6e73] underline-offset-2 hover:underline">
                Not right now
              </button>
            ) : null}
          </div>
          {declining ? (
            <div className="mt-2 rounded-lg border border-black/10 bg-[#f5f5f7] p-4">
              <label className="grid gap-1.5 text-sm font-medium">
                What would make this a yes? <span className="font-normal text-[#86868b]">(optional)</span>
                <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => void decline()}
                  disabled={busy}
                  className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30 disabled:opacity-50"
                >
                  Send
                </button>
                <button type="button" onClick={() => setDeclining(false)} className="text-sm text-[#6e6e73] hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </form>
      )}
    </section>
  );
}
