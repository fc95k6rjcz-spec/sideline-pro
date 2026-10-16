"use client";

import { useState } from "react";
import { ACTIVITY_KINDS, FEATURES, OUTCOMES, OWNERS, roleLabel } from "@/lib/crm/constants";
import { api } from "@/lib/crm/client";
import { isLiveAppointment } from "@/lib/crm/derive";
import type { Activity } from "@/lib/crm/types";
import { useCrm } from "./CrmProvider";
import { Btn, Chip, ChipToggle, Field, SectionTitle, cx, inputClass } from "./ui";

type Run = (fn: () => Promise<unknown>) => Promise<void>;

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ActivityTab({ clubId, activities, run }: { clubId: string; activities: Activity[] | null; run: Run }) {
  const { ix, views } = useCrm();
  const club = views.get(clubId)?.club;
  const people = (ix?.apptsByClub.get(clubId) ?? [])
    .filter((a) => isLiveAppointment(a) && a.person_id)
    .map((a) => ({ id: a.person_id!, label: `${ix?.personById.get(a.person_id!)?.full_name ?? "?"} (${roleLabel(a.role_category)})` }));
  const uniquePeople = [...new Map(people.map((p) => [p.id, p])).values()];

  const blank = {
    kind: "email", direction: "outbound", outcome: "no_response", occurred_at: localNow(), subject: "", body: "",
    person_ids: [] as string[], feature_interest: [] as string[], pain_points: "", followup_days: "7", followup_title: "",
    followup_owner: club?.owner ?? "",
  };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);

  async function save() {
    await run(async () => {
      await api.create("activities", {
        club_id: clubId,
        kind: f.kind,
        direction: f.kind === "note" ? null : f.direction,
        outcome: f.kind === "note" ? null : f.outcome,
        occurred_at: new Date(f.occurred_at).toISOString(),
        subject: f.subject,
        body: f.body,
        person_ids: f.person_ids,
        feature_interest: f.feature_interest,
        pain_points: f.pain_points,
      });
      // Interest heard in a conversation is added to the club's record.
      if (f.feature_interest.length && club) {
        const merged = [...new Set([...club.feature_interest, ...f.feature_interest])];
        if (merged.length !== club.feature_interest.length) await api.update("clubs", clubId, { feature_interest: merged });
      }
      if (f.followup_days) {
        await api.create("tasks", {
          club_id: clubId,
          person_id: f.person_ids[0] ?? null,
          title: f.followup_title || `Follow up: ${f.subject || ACTIVITY_KINDS.find((k) => k.key === f.kind)?.label}`,
          due_on: addDays(Number(f.followup_days)),
          owner: f.followup_owner,
        });
      }
    });
    setF({ ...blank, occurred_at: localNow() });
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      {!open ? (
        <Btn kind="primary" onClick={() => setOpen(true)}>+ Log email, call, meeting or note</Btn>
      ) : (
        <div className="space-y-3 rounded-xl border border-gold/50 p-4">
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_KINDS.map((k) => (
              <button key={k.key} type="button" onClick={() => setF({ ...f, kind: k.key })}
                className={cx("rounded-full border px-3 py-1 text-xs font-semibold", f.kind === k.key ? "border-[#1d1d1f] bg-[#1d1d1f] text-white" : "border-black/10 text-[#6e6e73]")}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {f.kind !== "note" ? (
              <>
                <Field label="Direction">
                  <select className={inputClass} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value, outcome: e.target.value === "inbound" ? "replied" : f.outcome })}>
                    <option value="outbound">We reached out</option>
                    <option value="inbound">They contacted us / replied</option>
                  </select>
                </Field>
                <Field label="Outcome">
                  <select className={inputClass} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>
                    {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label="When"><input type="datetime-local" className={inputClass} value={f.occurred_at} onChange={(e) => setF({ ...f, occurred_at: e.target.value })} /></Field>
          </div>
          {uniquePeople.length ? (
            <Field label="Who was involved">
              <ChipToggle options={uniquePeople.map((p) => ({ key: p.id, label: p.label }))} value={f.person_ids} onChange={(v) => setF({ ...f, person_ids: v })} />
            </Field>
          ) : null}
          <Field label="Subject"><input className={inputClass} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Notes"><textarea className={inputClass} rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="What was said, what they use now, objections…" /></Field>
          <Field label="Feature interest raised"><ChipToggle options={FEATURES} value={f.feature_interest} onChange={(v) => setF({ ...f, feature_interest: v })} /></Field>
          <Field label="Pain points mentioned"><input className={inputClass} value={f.pain_points} onChange={(e) => setF({ ...f, pain_points: e.target.value })} /></Field>
          <div className="grid gap-2 rounded-lg bg-[#fafafa] p-2 sm:grid-cols-3">
            <Field label="Follow up in">
              <select className={inputClass} value={f.followup_days} onChange={(e) => setF({ ...f, followup_days: e.target.value })}>
                <option value="">No follow-up</option>
                <option value="2">2 days</option><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">1 month</option><option value="90">3 months</option>
              </select>
            </Field>
            <Field label="Follow-up action"><input className={inputClass} value={f.followup_title} onChange={(e) => setF({ ...f, followup_title: e.target.value })} placeholder="e.g. Call if no reply" /></Field>
            <Field label="Owner">
              <select className={inputClass} value={f.followup_owner} onChange={(e) => setF({ ...f, followup_owner: e.target.value })}>
                <option value="">—</option>
                {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-[11px] text-[#86868b]">Logging outreach moves a club from research/ready to Contacted; a reply moves it to Engaged; a demo to Demo booked.</p>
          <div className="flex gap-2">
            <Btn kind="primary" onClick={save}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <section>
        <SectionTitle>Every interaction with this club</SectionTitle>
        {!activities ? <div className="text-xs text-[#86868b]">Loading…</div> : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[#86868b]">Not contacted yet.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-black/10 pl-4">
            {activities.map((a) => <TimelineItem key={a.id} a={a} run={run} />)}
          </ol>
        )}
      </section>
    </div>
  );
}

function TimelineItem({ a, run }: { a: Activity; run: Run }) {
  const { ix } = useCrm();
  const [expanded, setExpanded] = useState(false);
  const names = a.person_ids.map((id) => ix?.personById.get(id)?.full_name).filter(Boolean);
  const when = new Date(a.occurred_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  if (a.kind === "stage_change") {
    return (
      <li className="text-[11px] text-[#86868b]">
        <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#c7c7cc]" />
        {when} · Stage: {a.subject}{a.body ? ` (${a.body})` : ""} · {a.created_by_email?.split("@")[0]}
      </li>
    );
  }
  const kind = ACTIVITY_KINDS.find((k) => k.key === a.kind)?.label ?? a.kind;
  const outcome = OUTCOMES.find((o) => o.key === a.outcome)?.label;
  const long = (a.body ?? "").length > 280;
  return (
    <li>
      <span className={cx("absolute -left-[6px] mt-1.5 h-3 w-3 rounded-full border-2 border-white", a.direction === "inbound" ? "bg-[#2E9E62]" : "bg-gold")} />
      <div className="rounded-lg border border-black/5 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <b>{kind}</b>
            {a.direction ? <span className="text-[#86868b]">{a.direction === "inbound" ? "from club" : "to club"}</span> : null}
            {outcome ? <Chip className={a.outcome === "no_response" ? "bg-[#FDF1E0] text-[#9A6A1A]" : "bg-[#E7F6EE] text-[#1B7A47]"}>{outcome}</Chip> : null}
            {names.length ? <span className="text-[#3a3a3c]">· {names.join(", ")}</span> : null}
          </div>
          <span className="text-[#86868b]">{when} · {a.created_by_email?.split("@")[0]}</span>
        </div>
        {a.subject ? <div className="mt-1 text-sm font-semibold">{a.subject}</div> : null}
        {a.body ? (
          <div className="mt-1 whitespace-pre-wrap text-xs text-[#3a3a3c]">
            {long && !expanded ? `${a.body.slice(0, 280)}…` : a.body}
            {long ? <button type="button" className="ml-1 text-gold" onClick={() => setExpanded((x) => !x)}>{expanded ? "less" : "more"}</button> : null}
          </div>
        ) : null}
        {a.feature_interest.length || a.pain_points ? (
          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
            {a.feature_interest.map((k) => <Chip key={k} className="bg-[rgba(189,138,44,0.12)] text-[#8A6418]">{FEATURES.find((x) => x.key === k)?.label ?? k}</Chip>)}
            {a.pain_points ? <span className="text-[#6e6e73]">Pain: {a.pain_points}</span> : null}
          </div>
        ) : null}
        {a.kind === "email" && a.direction === "outbound" && a.outcome === "no_response" ? (
          <button type="button" className="mt-1 text-[11px] text-[#2D5DA8] hover:underline"
            onClick={() => run(() => api.create("activities", { club_id: a.club_id, kind: "email", direction: "inbound", outcome: "replied", person_ids: a.person_ids, subject: `Reply to: ${a.subject ?? "email"}` }))}>
            They replied →
          </button>
        ) : null}
      </div>
    </li>
  );
}
