"use client";

import { useMemo, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { PURCHASE_ROLES, ROLES, ROLE_BY_KEY, roleLabel } from "@/lib/crm/constants";
import { api } from "@/lib/crm/client";
import { fmtDate, isLiveAppointment, isStale } from "@/lib/crm/derive";
import { categoriseRole } from "@/lib/crm/roles";
import { todayISO } from "@/lib/crm/normalise";
import type { Appointment, ContactPoint, Person } from "@/lib/crm/types";
import { useCrm } from "./CrmProvider";
import { Btn, Chip, ErrorBox, Field, SectionTitle, VerifChip, cx, inputClass, menuClass } from "./ui";

type Run = (fn: () => Promise<unknown>) => Promise<void>;

const INBOX_LABEL: Record<ContactPoint["inbox_type"], string> = {
  personal: "Personal",
  role: "Role inbox",
  general: "General club",
  work: "Work (research only)",
};

export function ContactPointLine({ cp, run }: { cp: ContactPoint; run: Run }) {
  const Icon = cp.kind === "email" ? Mail : Phone;
  const { today } = useCrm();
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5 text-xs", cp.status !== "active" && "opacity-60")}>
      <Icon className="h-3 w-3 text-[#86868b]" />
      {cp.kind === "email" ? <a href={`mailto:${cp.value}`} className="text-[#2D5DA8] hover:underline">{cp.value}</a> : <a href={`tel:${cp.value_norm}`} className="hover:underline">{cp.value}</a>}
      <Chip className="bg-[#f5f5f7] text-[#6e6e73]">{INBOX_LABEL[cp.inbox_type]}{cp.role_category && cp.inbox_type === "role" ? ` · ${roleLabel(cp.role_category)}` : ""}</Chip>
      {cp.label ? <span className="text-[#86868b]">{cp.label}</span> : null}
      {cp.status !== "active" ? <Chip className="bg-[#FBE9E7] text-[#C8332B]">{cp.status}</Chip> : null}
      {cp.inbox_type === "work" && !cp.outreach_ok ? <Chip className="bg-[#F0F0F2] text-[#6E6E73]" title="Never used for outreach">not for outreach</Chip> : null}
      <VerifChip v={cp.verification} verifiedOn={cp.verified_on} stale={isStale(cp.verified_on, today)} />
      <select
        className={menuClass}
        title="More actions"
        value=""
        onChange={(e) => {
          const a = e.target.value;
          if (a === "delete") {
            if (confirm(`Remove ${cp.value}?`)) run(() => api.remove("contact_points", cp.id));
          } else if (a === "checked") run(() => api.update("contact_points", cp.id, { verified_on: todayISO(), verification: "verified" }));
          else if (a) run(() => api.update("contact_points", cp.id, { status: a }));
        }}
      >
        <option value="">⋯</option>
        <option value="checked">Checked today</option>
        {cp.status !== "active" ? <option value="active">Mark active</option> : null}
        <option value="bounced">Mark bounced</option>
        <option value="stale">Mark out of date</option>
        <option value="delete">Remove</option>
      </select>
    </div>
  );
}

export function CommitteeTab({ clubId, run }: { clubId: string; run: Run }) {
  const { ix } = useCrm();
  const appts = ix?.apptsByClub.get(clubId) ?? [];
  const cps = ix?.cpsByClub.get(clubId) ?? [];
  const [showFormer, setShowFormer] = useState(false);

  const groups = useMemo(() => {
    const keys = new Set<string>([
      ...appts.map((a) => a.role_category),
      ...cps.filter((c) => c.inbox_type === "role" && c.role_category).map((c) => c.role_category!),
    ]);
    return ROLES.filter((r) => keys.has(r.key)).map((r) => ({
      role: r,
      live: appts.filter((a) => a.role_category === r.key && (isLiveAppointment(a) || a.status === "vacant")),
      former: appts.filter((a) => a.role_category === r.key && a.status === "former")
        .sort((a, b) => ((a.ended_on ?? "") < (b.ended_on ?? "") ? 1 : -1)),
      inboxes: cps.filter((c) => c.inbox_type === "role" && c.role_category === r.key),
    }));
  }, [appts, cps]);
  const general = cps.filter((c) => c.inbox_type === "general");
  const formerCount = groups.reduce((n, g) => n + g.former.length, 0);

  return (
    <div className="space-y-6">
      <AddContact clubId={clubId} run={run} />

      <section className="space-y-3">
        <SectionTitle right={formerCount ? <Btn small kind="ghost" onClick={() => setShowFormer((s) => !s)}>{showFormer ? "Hide" : "Show"} previous holders ({formerCount})</Btn> : null}>
          Committee
        </SectionTitle>
        {groups.length === 0 ? <div className="text-sm text-[#86868b]">No committee members recorded yet.</div> : null}
        {groups.map((g) => (
          <div key={g.role.key} className="rounded-xl border border-black/5">
            <div className="flex items-baseline justify-between gap-2 border-b border-black/5 bg-[#fafafa] px-3 py-1.5">
              <span className="text-xs font-semibold">{g.role.label}</span>
              {g.role.proposition ? <span className="hidden truncate text-[10.5px] text-[#86868b] sm:inline">{g.role.proposition}</span> : null}
            </div>
            <div className="divide-y divide-black/5">
              {g.live.map((a) => <AppointmentRow key={a.id} a={a} run={run} />)}
              {g.inboxes.filter((cp) => !cp.person_id || !g.live.some((a) => a.person_id === cp.person_id)).map((cp) => (
                <div key={cp.id} className="px-3 py-2">
                  <div className="mb-1 text-xs text-[#86868b]">Role inbox{cp.person_id ? "" : " — current holder not named"}</div>
                  <ContactPointLine cp={cp} run={run} />
                </div>
              ))}
              {showFormer && g.former.map((a) => <AppointmentRow key={a.id} a={a} run={run} />)}
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle>General club contacts</SectionTitle>
        <p className="mb-2 text-[11px] text-[#86868b]">Used for outreach only when no role-specific contact is available.</p>
        <div className="space-y-1.5">
          {general.length === 0 ? <div className="text-xs text-[#86868b]">None recorded.</div> : general.map((cp) => <ContactPointLine key={cp.id} cp={cp} run={run} />)}
        </div>
        <AddClubContactPoint clubId={clubId} run={run} />
      </section>
    </div>
  );
}

function AppointmentRow({ a, run }: { a: Appointment; run: Run }) {
  const { ix, openPerson, today } = useCrm();
  const p: Person | undefined = a.person_id ? ix?.personById.get(a.person_id) : undefined;
  const personCps = (a.person_id ? ix?.cpsByPerson.get(a.person_id) : []) ?? [];
  const otherRoles = (a.person_id ? ix?.apptsByPerson.get(a.person_id) ?? [] : []).filter((x) => x.id !== a.id && isLiveAppointment(x));
  const [handover, setHandover] = useState(false);
  const former = a.status === "former";
  return (
    <div className={cx("px-3 py-2.5", former && "bg-[#fafafa] opacity-75")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {p ? (
              <button type="button" className="text-sm font-semibold hover:text-gold" onClick={() => openPerson(p.id)}>{p.full_name}</button>
            ) : (
              <span className="text-sm font-semibold text-[#C8332B]">Vacant</span>
            )}
            {a.original_title && a.original_title !== ROLE_BY_KEY[a.role_category]?.label ? <span className="text-xs text-[#6e6e73]">“{a.original_title}”</span> : null}
            {a.status !== "current" ? (
              <Chip className={a.status === "former" ? "bg-[#F0F0F2] text-[#6E6E73]" : a.status === "vacant" ? "bg-[#FBE9E7] text-[#C8332B]" : "bg-[#FDF1E0] text-[#9A6A1A]"}>
                {a.status === "unverified" ? "Unconfirmed holder" : a.status}
              </Chip>
            ) : null}
            {!former ? <VerifChip v={a.verification} verifiedOn={a.verified_on} stale={isStale(a.verified_on, today)} /> : null}
            {p?.champion_status && p.champion_status !== "none" ? <Chip className="bg-[rgba(189,138,44,0.14)] text-[#8A6418]">{p.champion_status} champion</Chip> : null}
          </div>
          <div className="mt-0.5 text-[11px] text-[#86868b]">
            {former
              ? `Held ${a.season ?? [a.started_on && fmtDate(a.started_on), a.ended_on && fmtDate(a.ended_on)].filter(Boolean).join(" – ") ?? ""}${a.replaced_by_id ? " · replaced" : ""}`
              : [a.season && `Season ${a.season}`, a.started_on && `since ${fmtDate(a.started_on)}`].filter(Boolean).join(" · ")}
            {otherRoles.length ? ` · also ${otherRoles.map((o) => `${roleLabel(o.role_category)}${o.club_id !== a.club_id ? ` at ${ix?.clubById.get(o.club_id)?.name}` : ""}`).join(", ")}` : ""}
          </div>
          {a.notes ? <div className="mt-0.5 text-[11px] italic text-[#6e6e73]">{a.notes}</div> : null}
          {a.responsibilities ? <div className="mt-0.5 text-[11px] text-[#6e6e73]">Responsibilities: {a.responsibilities}</div> : null}
        </div>
        {!former ? (
          <div className="flex flex-wrap gap-1">
            <Btn small onClick={() => setHandover((h) => !h)}>Committee change</Btn>
            <Btn small kind="ghost" onClick={() => run(() => api.update("appointments", a.id, { verified_on: todayISO(), verification: "verified", ...(a.status === "unverified" ? { status: "current" } : {}) }))} title="Confirmed this is still right">Still current</Btn>
            <select className={menuClass} title="More actions" value="" onChange={(e) => {
              if (e.target.value === "ended") run(() => api.update("appointments", a.id, { status: "former", ended_on: todayISO() }));
              if (e.target.value === "delete" && confirm("Delete this appointment? Use this only for a mistake — use Committee change when someone stands down.")) run(() => api.remove("appointments", a.id));
            }}>
              <option value="">⋯</option>
              <option value="ended">Stood down (no replacement known)</option>
              <option value="delete">Delete (entered by mistake)</option>
            </select>
          </div>
        ) : null}
      </div>

      {!former && p ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-[#a1a1a6]">Buying role</span>
          {PURCHASE_ROLES.map((r) => {
            const on = a.purchase_roles.includes(r.key);
            return (
              <button key={r.key} type="button"
                onClick={() => run(() => api.update("appointments", a.id, { purchase_roles: on ? a.purchase_roles.filter((x) => x !== r.key) : [...a.purchase_roles, r.key] }))}
                className={cx("rounded-full border px-2 py-0.5 text-[10.5px]", on ? "border-gold bg-[rgba(189,138,44,0.12)] font-semibold text-[#8A6418]" : "border-black/10 text-[#86868b] hover:border-gold")}
                title="An assessment — confirm it in conversation">
                {r.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {!former ? (
        <div className="mt-1.5 space-y-1">
          {personCps.map((cp) => <ContactPointLine key={cp.id} cp={cp} run={run} />)}
          {(ix?.cpsByClub.get(a.club_id) ?? []).filter((cp) => cp.inbox_type === "role" && cp.role_category === a.role_category && cp.person_id === a.person_id && a.person_id)
            .filter((cp) => !personCps.some((x) => x.id === cp.id))
            .map((cp) => <ContactPointLine key={cp.id} cp={cp} run={run} />)}
        </div>
      ) : null}

      {handover ? <HandoverForm a={a} run={run} onDone={() => setHandover(false)} /> : null}
    </div>
  );
}

function HandoverForm({ a, run, onDone }: { a: Appointment; run: Run; onDone: () => void }) {
  const { snap } = useCrm();
  const [mode, setMode] = useState<"new" | "existing" | "vacant">("new");
  const [form, setForm] = useState({ full_name: "", email: "", person_id: "", effective_on: todayISO(), source_url: "", original_title: a.original_title ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setErr(null);
    if (mode === "new" && !form.full_name.trim()) return setErr("Enter who takes over");
    if (mode === "existing" && !form.person_id) return setErr("Choose who takes over");
    await run(() =>
      api.handover({
        appointment_id: a.id,
        effective_on: form.effective_on,
        vacant: mode === "vacant",
        person_id: mode === "existing" ? form.person_id : undefined,
        new_person: mode === "new" ? { full_name: form.full_name, email: form.email } : undefined,
        original_title: form.original_title,
        source_url: form.source_url,
      }),
    );
    onDone();
  };
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gold/50 bg-[#fffaf0] p-3">
      <div className="text-xs font-semibold">Record a committee change for {roleLabel(a.role_category).toLowerCase()}</div>
      <p className="text-[11px] text-[#6e6e73]">The current holder is kept as a former appointment with this end date. Their contact history stays on their record. The role inbox moves to the new holder.</p>
      <div className="flex gap-3 text-xs">
        {([["new", "Someone new"], ["existing", "Someone already in the CRM"], ["vacant", "Role now vacant"]] as const).map(([k, l]) => (
          <label key={k} className="flex items-center gap-1"><input type="radio" checked={mode === k} onChange={() => setMode(k)} /> {l}</label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {mode === "new" ? (
          <>
            <Field label="New holder's name"><input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Their email (optional)"><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </>
        ) : mode === "existing" ? (
          <Field label="Person" className="sm:col-span-2">
            <select className={inputClass} value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })}>
              <option value="">Choose…</option>
              {[...(snap?.people ?? [])].sort((x, y) => x.full_name.localeCompare(y.full_name)).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Effective from"><input type="date" className={inputClass} value={form.effective_on} onChange={(e) => setForm({ ...form, effective_on: e.target.value })} /></Field>
        <Field label="Club's title for the role"><input className={inputClass} value={form.original_title} onChange={(e) => setForm({ ...form, original_title: e.target.value })} /></Field>
        <Field label="Source URL" className="sm:col-span-2"><input className={inputClass} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Committee page, AGM minutes, email…" /></Field>
      </div>
      <ErrorBox>{err}</ErrorBox>
      <div className="flex gap-2">
        <Btn kind="primary" onClick={submit}>Record change</Btn>
        <Btn onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddContact({ clubId, run }: { clubId: string; run: Run }) {
  const { snap, ix } = useCrm();
  const [open, setOpen] = useState(false);
  const blank = { mode: "new" as "new" | "existing", full_name: "", person_id: "", original_title: "", role_category: "", status: "current", email: "", email_type: "personal", phone: "", source_url: "", verified_on: "", responsibilities: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const role = f.role_category || (f.original_title ? categoriseRole(f.original_title) : "");
  const holders = role
    ? (ix?.apptsByClub.get(clubId) ?? []).filter((a) => a.role_category === role && isLiveAppointment(a) && a.person_id && a.person_id !== f.person_id)
    : [];
  const singleHolder = !["committee_member", "other", "team_coordinator"].includes(role);
  const emailLooksRole = /treasur|secretar|president|registr|umpir|coach/i.test(f.email.split("@")[0] ?? "");

  async function save(asHandover: boolean) {
    setErr(null);
    if (f.mode === "new" && !f.full_name.trim()) return setErr("Enter a name");
    if (f.mode === "existing" && !f.person_id) return setErr("Choose a person");
    if (!role) return setErr("Choose a role");
    const verified_on = f.verified_on || (f.source_url ? todayISO() : "");
    const verification = f.source_url ? "verified" : "unverified";
    const src = { source_url: f.source_url, verified_on };
    await run(async () => {
      let personId = f.person_id;
      if (asHandover && holders[0]) {
        const r = await api.handover({
          appointment_id: holders[0].id,
          person_id: f.mode === "existing" ? f.person_id : undefined,
          new_person: f.mode === "new" ? { full_name: f.full_name } : undefined,
          original_title: f.original_title,
          ...src,
        });
        personId = r.appointment.person_id ?? "";
      } else {
        if (f.mode === "new") {
          const { record } = await api.create<Person>("people", { full_name: f.full_name, verification, ...src });
          personId = record.id;
        }
        await api.create("appointments", {
          club_id: clubId, person_id: personId, role_category: role, original_title: f.original_title || ROLE_BY_KEY[role]?.label,
          status: f.status, responsibilities: f.responsibilities, verification, ...src,
        });
      }
      if (f.email.trim() && personId) {
        const isRole = f.email_type === "role";
        await api.create("contact_points", {
          kind: "email", value: f.email, inbox_type: f.email_type,
          person_id: personId, club_id: isRole ? clubId : null, role_category: isRole ? role : null, verification, ...src,
        });
      }
      if (f.phone.trim() && personId) {
        await api.create("contact_points", { kind: "phone", value: f.phone, inbox_type: "personal", person_id: personId, verification, ...src });
      }
    });
    setF(blank);
    setOpen(false);
  }

  if (!open) return <Btn kind="primary" onClick={() => setOpen(true)}>+ Add committee member / contact</Btn>;
  return (
    <div className="space-y-3 rounded-xl border border-gold/50 p-4">
      <div className="flex gap-3 text-xs">
        <label className="flex items-center gap-1"><input type="radio" checked={f.mode === "new"} onChange={() => setF({ ...f, mode: "new" })} /> New person</label>
        <label className="flex items-center gap-1"><input type="radio" checked={f.mode === "existing"} onChange={() => setF({ ...f, mode: "existing" })} /> Already in the CRM (e.g. volunteers at two clubs)</label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {f.mode === "new" ? (
          <Field label="Full name"><input className={inputClass} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        ) : (
          <Field label="Person">
            <select className={inputClass} value={f.person_id} onChange={(e) => setF({ ...f, person_id: e.target.value })}>
              <option value="">Choose…</option>
              {[...(snap?.people ?? [])].sort((x, y) => x.full_name.localeCompare(y.full_name)).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Title the club uses" hint={f.original_title && !f.role_category ? `Filed as: ${roleLabel(role)}` : undefined}>
          <input className={inputClass} value={f.original_title} onChange={(e) => setF({ ...f, original_title: e.target.value })} placeholder="e.g. Umpire Convenor" />
        </Field>
        <Field label="Standard role">
          <select className={inputClass} value={f.role_category} onChange={(e) => setF({ ...f, role_category: e.target.value })}>
            <option value="">{f.original_title ? `Auto: ${roleLabel(role)}` : "Choose…"}</option>
            {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="current">Current</option>
            <option value="unverified">Unconfirmed (e.g. two people listed)</option>
          </select>
        </Field>
        <Field label="Email" hint={emailLooksRole && f.email_type === "personal" ? "This looks like a role inbox — consider “Role inbox”." : undefined}>
          <div className="flex gap-1">
            <input className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <select className={cx(inputClass, "w-auto")} value={f.email_type} onChange={(e) => setF({ ...f, email_type: e.target.value })}>
              <option value="personal">Personal</option>
              <option value="role">Role inbox</option>
              <option value="work">Work (research only)</option>
            </select>
          </div>
        </Field>
        <Field label="Mobile / phone"><input className={inputClass} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Responsibilities" className="sm:col-span-2"><input className={inputClass} value={f.responsibilities} onChange={(e) => setF({ ...f, responsibilities: e.target.value })} placeholder="Optional — what this role covers at this club" /></Field>
        <Field label="Source URL"><input className={inputClass} value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} placeholder="Committee page, directory…" /></Field>
        <Field label="Date checked"><input type="date" className={inputClass} value={f.verified_on} onChange={(e) => setF({ ...f, verified_on: e.target.value })} /></Field>
      </div>
      {holders.length && singleHolder ? (
        <div className="rounded-md bg-[#FDF1E0] px-3 py-2 text-xs text-[#9A6A1A]">
          {holders.map((h) => ix?.personById.get(h.person_id!)?.full_name).join(" and ")} {holders.length > 1 ? "are" : "is"} recorded as {roleLabel(role).toLowerCase()}.
          If this person has taken over, record it as a committee change so the history is kept.
        </div>
      ) : null}
      <ErrorBox>{err}</ErrorBox>
      <div className="flex flex-wrap gap-2">
        {holders.length && singleHolder ? (
          <>
            <Btn kind="primary" onClick={() => save(true)}>Record as committee change</Btn>
            <Btn onClick={() => save(false)}>Add alongside (shared role)</Btn>
          </>
        ) : (
          <Btn kind="primary" onClick={() => save(false)}>Add</Btn>
        )}
        <Btn kind="ghost" onClick={() => { setF(blank); setOpen(false); }}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddClubContactPoint({ clubId, run }: { clubId: string; run: Run }) {
  const [f, setF] = useState({ value: "", inbox_type: "general", role_category: "", label: "", source_url: "" });
  const kind = f.value.includes("@") ? "email" : "phone";
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.value.trim()) return;
        run(() =>
          api.create("contact_points", {
            club_id: clubId, kind, value: f.value, inbox_type: f.inbox_type,
            role_category: f.inbox_type === "role" ? f.role_category : null, label: f.label, source_url: f.source_url,
            verified_on: f.source_url ? todayISO() : "", verification: f.source_url ? "verified" : "unverified",
          }),
        ).then(() => setF({ value: "", inbox_type: "general", role_category: "", label: "", source_url: "" }));
      }}
    >
      <input className={cx(inputClass, "min-w-[200px] flex-1")} placeholder="info@club.org.au or phone" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
      <select className={cx(inputClass, "w-auto")} value={f.inbox_type} onChange={(e) => setF({ ...f, inbox_type: e.target.value })}>
        <option value="general">General club</option>
        <option value="role">Role inbox (holder unknown)</option>
      </select>
      {f.inbox_type === "role" ? (
        <select className={cx(inputClass, "w-auto")} value={f.role_category} onChange={(e) => setF({ ...f, role_category: e.target.value })} required>
          <option value="">Role…</option>
          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      ) : null}
      <input className={cx(inputClass, "w-40")} placeholder="Source URL" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} />
      <Btn type="submit" disabled={!f.value.trim()}>Add</Btn>
    </form>
  );
}
