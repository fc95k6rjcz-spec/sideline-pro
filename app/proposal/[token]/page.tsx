import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import {
  formatAud,
  formatProposalDate,
  normaliseProposalRow,
  periodLabel,
  proposalExpired,
  toPublicProposal,
} from "@/lib/proposals";
import { ProposalActions } from "./ProposalActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** Signed in AND on the admin allowlist — the only people who may see a draft. */
async function viewerIsAdmin(): Promise<boolean> {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    return Boolean(user && isAllowedEmail(user.email));
  } catch {
    return false;
  }
}

/**
 * A draft is invisible to the public and visible to us.
 *
 * The token is the only secret on this page, so a draft must never render
 * for whoever holds the link — half-written prices and terms are not a
 * document anyone should be able to find. But hiding it from US made the
 * quote unreviewable: the pipeline offered a link to the thing you had just
 * written and it 404ed, with no way to see what a club would see before
 * pressing send (Justin, 21 Oct 2026: "I should be able to click view
 * proposal or quote and then go into the quote you built before I send
 * it").
 *
 * So the gate is the ADMIN SESSION, not the token. Signed in and on the
 * allowlist: you see the draft, with a banner saying it is one. Anyone
 * else: 404, exactly as before.
 */
async function loadProposal(token: string) {
  if (!token || token.length < 12) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("proposals").select("*").eq("token", token).maybeSingle();
  if (!data) return null;
  const row = normaliseProposalRow(data as Record<string, unknown>);
  if (row.status === "draft" && !(await viewerIsAdmin())) return null;
  return row;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const row = await loadProposal(token);
  return {
    title: row ? `${row.title} — proposal for ${row.club_name} | Sideline Pro` : "Proposal | Sideline Pro",
    robots: { index: false, follow: false },
  };
}

/**
 * The proposal a club opens from its link. Reads like a short document —
 * what we are proposing, what is included, what it costs, the terms, the
 * designed PDF if one is attached — and ends with "Accept this proposal".
 * The view is recorded by the client component (so a crawler following the
 * link in an email client does not count as the committee reading it).
 */
export default async function ProposalPage({ params }: Props) {
  const { token } = await params;
  const row = await loadProposal(token);
  if (!row) notFound();
  const isDraft = row.status === "draft";
  const proposal = toPublicProposal(row);
  const expired = proposal.status !== "accepted" && proposalExpired(proposal.valid_until);
  const total = proposal.pricing.reduce((n, l) => n + l.amount_cents, 0);
  const periods = new Set(proposal.pricing.map((l) => l.period ?? "once"));
  const showTotal = proposal.pricing.length > 1 && periods.size === 1;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Only an admin ever reaches this branch — see loadProposal. The point
          is that it should be impossible to mistake a preview for the live
          page and think a club has already received it. */}
      {isDraft ? (
        <div className="bg-[#8c1d18] px-6 py-3 text-center text-sm font-bold text-white">
          DRAFT — not sent. Only you can see this. The club gets nothing until you press Send in Prospects.
        </div>
      ) : null}
      <header className="bg-[#0b1b33] text-white">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-6 py-5">
          <Image src="/logo-horizontal-light.svg" alt="Sideline Pro" width={168} height={40} className="h-9 w-auto" priority />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#2dd4bf]">Proposal</span>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-6 pb-20 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Prepared for {proposal.club_name}</p>
        <h1 className="mt-3 text-[clamp(28px,4.5vw,40px)] font-bold leading-[1.1] tracking-[-0.02em]">{proposal.title}</h1>
        {proposal.headline ? <p className="mt-4 text-lg leading-relaxed text-[#3a3a3c]">{proposal.headline}</p> : null}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#6e6e73]">
          {proposal.sent_at ? <span>Sent {formatProposalDate(proposal.sent_at)}</span> : null}
          {proposal.valid_until ? (
            <span className={expired ? "font-semibold text-[#dc2626]" : ""}>
              {expired ? "Expired" : "Valid until"} {formatProposalDate(proposal.valid_until)}
            </span>
          ) : null}
        </div>

        {proposal.intro ? (
          <section className="mt-10 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
            {proposal.intro.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className={`text-[15.5px] leading-[1.7] text-[#3a3a3c] ${i > 0 ? "mt-4" : ""}`}>
                {para}
              </p>
            ))}
          </section>
        ) : null}

        {proposal.includes.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">What&rsquo;s included</h2>
            <ul className="mt-4 divide-y divide-black/[.06]">
              {proposal.includes.map((item, i) => (
                <li key={i} className="flex gap-4 py-3.5">
                  <span aria-hidden className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#10b3a3] text-[11px] font-bold text-white">
                    ✓
                  </span>
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    {item.detail ? <div className="mt-0.5 text-sm leading-relaxed text-[#6e6e73]">{item.detail}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {proposal.pricing.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Pricing</h2>
            <div className="mt-4 divide-y divide-black/[.06]">
              {proposal.pricing.map((line, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <div className="font-semibold">{line.label}</div>
                    {line.note ? <div className="mt-0.5 text-sm text-[#6e6e73]">{line.note}</div> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold tabular-nums">{formatAud(line.amount_cents)}</div>
                    {line.period ? <div className="text-xs text-[#6e6e73]">{periodLabel(line.period)}</div> : null}
                  </div>
                </div>
              ))}
              {showTotal ? (
                <div className="flex items-center justify-between gap-4 pt-4">
                  <div className="text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Total</div>
                  <div className="text-xl font-bold tabular-nums">
                    {formatAud(total)}{" "}
                    <span className="text-xs font-normal text-[#6e6e73]">{periodLabel(proposal.pricing[0]?.period)}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-[#86868b]">All amounts in Australian dollars. GST as applicable.</p>
          </section>
        ) : null}

        {proposal.pdf_url ? (
          <section className="mt-6 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">The full proposal</h2>
            <p className="mt-2 text-sm text-[#3a3a3c]">The designed proposal document, as a PDF.</p>
            <a
              href={proposal.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-black/30"
            >
              Open the PDF ↗
            </a>
          </section>
        ) : null}

        {proposal.terms ? (
          <section className="mt-6 rounded-2xl border border-black/[.06] bg-white p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Terms</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#3a3a3c]">{proposal.terms}</div>
          </section>
        ) : null}

        <ProposalActions proposal={proposal} expired={expired} />

        <footer className="mt-12 text-center text-xs text-[#86868b]">
          Sideline Pro · Club management for Australian community sport ·{" "}
          <a href="mailto:justin@sidelinepro.com.au" className="underline">
            justin@sidelinepro.com.au
          </a>
        </footer>
      </main>
    </div>
  );
}
