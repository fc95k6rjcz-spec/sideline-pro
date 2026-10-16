"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BACKGROUND_TAGS, roleLabel } from "@/lib/crm/constants";
import { api } from "@/lib/crm/client";
import { fmtDate, isStale } from "@/lib/crm/derive";
import { hrefFor, todayISO } from "@/lib/crm/normalise";
import type { Person } from "@/lib/crm/types";
import { useCrm } from "./CrmProvider";
import { ContactPointLine } from "./CommitteeTab";
import { Btn, Chip, ChipToggle, ErrorBox, ExtLink, Field, SectionTitle, StageChip, VerifChip, cx, inputClass } from "./ui";

export default function PersonPanel() {
  const { personId, openPerson, openClub, ix, reload, today } = useCrm();
  const p = personId ? ix?.personById.get(personId) : undefined;
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openPerson(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPerson]);

  if (!personId) return null;
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
  };

  const appts = (ix?.apptsByPerson.get(personId) ?? []).slice().sort((a, b) => (a.status === "former" ? 1 : 0) - (b.status === "former" ? 1 : 0));
  const cps = ix?.cpsByPerson.get(personId) ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/10" onClick={() => openPerson(null)} />
      <aside className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-white px-5 py-4 shadow-[0_0_60px_rgba(0,0,0,0.2)]">
        {!p ? <div className="text-sm text-[#86868b]">Person not found.</div> : (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">Person</div>
                <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{p.full_name}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <VerifChip v={p.verification} verifiedOn={p.verified_on} stale={isStale(p.verified_on, today)} />
                  {p.unsubscribed_at ? <Chip className="bg-[#FBE9E7] text-[#C8332B]">Unsubscribed {fmtDate(p.unsubscribed_at)}</Chip> : null}
                  {p.do_not_contact ? <Chip className="bg-[#FBE9E7] text-[#C8332B]">Do not contact</Chip> : null}
                </div>
              </div>
              <button type="button" onClick={() => openPerson(null)} className="rounded-md p-1 text-[#86868b] hover:bg-[#f5f5f7]" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <ErrorBox>{err}</ErrorBox>

            <section>
              <SectionTitle>Roles</SectionTitle>
              <div className="divide-y divide-black/5 rounded-xl border border-black/5">
                {appts.length === 0 ? <div className="px-3 py-2 text-xs text-[#86868b]">No roles recorded.</div> : appts.map((a) => {
                  const club = ix?.clubById.get(a.club_id);
                  return (
                    <div key={a.id} className={cx("flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm", a.status === "former" && "opacity-60")}>
                      <div>
                        <b>{roleLabel(a.role_category)}</b>{a.original_title && a.original_title !== roleLabel(a.role_category) ? <span className="text-xs text-[#6e6e73]"> “{a.original_title}”</span> : null}
                        {" at "}
                        <button type="button" className="font-semibold hover:text-gold" onClick={() => { openPerson(null); openClub(a.club_id); }}>{club?.name}</button>
                        <div className="text-[11px] text-[#86868b]">
                          {a.status === "former" ? `Former${a.ended_on ? ` · ended ${fmtDate(a.ended_on)}` : ""}${a.season ? ` · ${a.season}` : ""}` : a.status === "unverified" ? "Unconfirmed holder" : "Current"}
                          {a.purchase_roles.length ? ` · ${a.purchase_roles.join(", ").replace(/_/g, " ")}` : ""}
                        </div>
                      </div>
                      {club ? <StageChip stage={club.stage} /> : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionTitle>Contact details</SectionTitle>
              <div className="space-y-1.5">
                {cps.length === 0 ? <div className="text-xs text-[#86868b]">None recorded.</div> : cps.map((cp) => <ContactPointLine key={cp.id} cp={cp} run={run} />)}
              </div>
              <AddPersonContact personId={p.id} run={run} />
            </section>

            <PersonForm p={p} run={run} />
          </div>
        )}
      </aside>
    </div>
  );
}

function AddPersonContact({ personId, run }: { personId: string; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = useState({ value: "", inbox_type: "personal", source_url: "" });
  return (
    <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => {
      e.preventDefault();
      if (!f.value.trim()) return;
      run(() => api.create("contact_points", {
        person_id: personId, kind: f.value.includes("@") ? "email" : "phone", value: f.value, inbox_type: f.inbox_type,
        source_url: f.source_url, verified_on: f.source_url ? todayISO() : "", verification: f.source_url ? "verified" : "unverified",
      })).then(() => setF({ value: "", inbox_type: "personal", source_url: "" }));
    }}>
      <input className={cx(inputClass, "min-w-[180px] flex-1")} placeholder="Email or mobile" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
      <select className={cx(inputClass, "w-auto")} value={f.inbox_type} onChange={(e) => setF({ ...f, inbox_type: e.target.value })}>
        <option value="personal">Personal</option>
        <option value="work">Work (research only — never emailed)</option>
      </select>
      <input className={cx(inputClass, "w-36")} placeholder="Source URL" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} />
      <Btn type="submit" disabled={!f.value.trim()}>Add</Btn>
    </form>
  );
}

function PersonForm({ p, run }: { p: Person; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { ix } = useCrm();
  const init = () => ({
    full_name: p.full_name, preferred_name: p.preferred_name ?? "", location: p.location ?? "",
    linkedin_url: p.linkedin_url ?? "", employer: p.employer ?? "", job_title: p.job_title ?? "", industry: p.industry ?? "",
    background_tags: p.background_tags, professional_source: p.professional_source ?? "", professional_verified_on: p.professional_verified_on ?? "",
    champion_status: p.champion_status, preferred_channel: p.preferred_channel ?? "", do_not_contact: p.do_not_contact,
    notes: p.notes ?? "", source_url: p.source_url ?? "", source_note: p.source_note ?? "", verified_on: p.verified_on ?? "", verification: p.verification,
  });
  const [f, setF] = useState(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(init()), [p.id, p.updated_at]);
  const set = (k: keyof ReturnType<typeof init>, v: unknown) => setF({ ...f, [k]: v });
  const confirmedPro = !!f.professional_verified_on;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <SectionTitle>Professional background</SectionTitle>
        <p className="text-[11px] text-[#86868b]">
          Confirmed details only. A job title shows experience that may help, not whether someone supports change.
          Suggested profile matches (Phase 2) will sit in a review queue and only reach this record once confirmed.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Employer"><input className={inputClass} value={f.employer} onChange={(e) => set("employer", e.target.value)} /></Field>
          <Field label="Job title"><input className={inputClass} value={f.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
          <Field label="Industry"><input className={inputClass} value={f.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
          <Field label="Public profile (LinkedIn etc.)">
            <input className={inputClass} value={f.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
            {p.linkedin_url ? <div className="mt-0.5 text-[11px]"><ExtLink href={hrefFor(p.linkedin_url)}>Open profile</ExtLink></div> : null}
          </Field>
          <Field label="Where this was confirmed"><input className={inputClass} value={f.professional_source} onChange={(e) => set("professional_source", e.target.value)} placeholder="URL, or 'told us on a call'" /></Field>
          <Field label="Confirmed on"><input type="date" className={inputClass} value={f.professional_verified_on} onChange={(e) => set("professional_verified_on", e.target.value)} /></Field>
        </div>
        <Field label="Relevant experience" hint={confirmedPro ? undefined : "Set a confirmed date for these to count in audience filters."}>
          <ChipToggle options={BACKGROUND_TAGS} value={f.background_tags} onChange={(v) => set("background_tags", v)} />
        </Field>
        <Field label="Internal champion">
          <select className={cx(inputClass, "w-auto")} value={f.champion_status} onChange={(e) => set("champion_status", e.target.value)}>
            <option value="none">Not assessed / no</option>
            <option value="potential">Potential — to test in conversation</option>
            <option value="confirmed">Confirmed — actively supporting us</option>
          </select>
        </Field>
      </section>

      <section className="space-y-2">
        <SectionTitle>Communication</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Preferred channel">
            <select className={inputClass} value={f.preferred_channel} onChange={(e) => set("preferred_channel", e.target.value)}>
              <option value="">Not known</option><option value="email">Email</option><option value="phone">Phone</option><option value="sms">SMS</option><option value="in_person">In person</option>
            </select>
          </Field>
          <Field label="Do not contact">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.do_not_contact} onChange={(e) => set("do_not_contact", e.target.checked)} /> Exclude from all outreach</label>
          </Field>
        </div>
        <div className="flex gap-2">
          {p.unsubscribed_at ? (
            <Btn small onClick={() => confirm("Re-subscribe? Only do this if they asked to hear from us again.") && run(() => api.update("people", p.id, { unsubscribed_at: "" }))}>Clear unsubscribe</Btn>
          ) : (
            <Btn small kind="danger" onClick={() => run(async () => {
              await api.update("people", p.id, { unsubscribed_at: new Date().toISOString() });
              // Suppress their own addresses too, so a re-import can't bring them back.
              for (const cp of (ix?.cpsByPerson.get(p.id) ?? []).filter((x) => x.kind === "email" && x.inbox_type !== "role")) {
                await api.create("suppressions", { email_norm: cp.value_norm, reason: "unsubscribed", person_id: p.id }).catch(() => undefined);
              }
            })}>Record unsubscribe</Btn>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>Record</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Full name"><input className={inputClass} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Goes by"><input className={inputClass} value={f.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} /></Field>
          <Field label="Location"><input className={inputClass} value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Verification">
            <select className={inputClass} value={f.verification} onChange={(e) => set("verification", e.target.value)}>
              <option value="verified">Verified</option><option value="unverified">Unverified</option>
            </select>
          </Field>
          <Field label="Source URL"><input className={inputClass} value={f.source_url} onChange={(e) => set("source_url", e.target.value)} /></Field>
          <Field label="Date checked"><input type="date" className={inputClass} value={f.verified_on} onChange={(e) => set("verified_on", e.target.value)} /></Field>
          <Field label="Source note" className="sm:col-span-2"><input className={inputClass} value={f.source_note} onChange={(e) => set("source_note", e.target.value)} /></Field>
          <Field label="Internal notes" className="sm:col-span-2"><textarea className={inputClass} rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-black/5 pt-3">
        <Btn kind="primary" onClick={() => run(() => api.update("people", p.id, f))}>Save person</Btn>
        <Btn kind="danger" small onClick={() => confirm(`Delete ${p.full_name} and all their roles and contact details? Use Committee change if they've simply stood down.`) && run(() => api.remove("people", p.id))}>Delete</Btn>
      </div>
    </div>
  );
}
