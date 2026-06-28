"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Prospect = {
  id: string;
  club_name: string;
  club_website: string | null;
  website_quality: string | null;
  website_functionality: string | null;
  approx_players: string | null;
  paid_umpires: string | null;
  treasurer_name: string | null;
  treasurer_email: string | null;
  treasurer_phone: string | null;
  target: string | null;
  notes: string | null;
  status: string | null;
  assigned_to: string | null;
  last_contacted: string | null; // YYYY-MM-DD
  next_action: string | null;
  date_emailed: string | null;   // YYYY-MM-DD
  correspondence: string | null; // free-text log
  follow_up_date: string | null; // YYYY-MM-DD — set means "needs follow-up"
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Interested",
  "Meeting booked",
  "Proposal sent",
  "Won",
  "Lost",
  "Not a fit",
] as const;

const QUALITY_OPTIONS = ["Low", "Medium", "High"] as const;
const TARGET_OPTIONS = ["Yes", "No", "Maybe"] as const;
const ASSIGNEE_OPTIONS = ["Justin", "Rowan"] as const;

type Filter = "all" | "followup" | "target" | "active" | "won" | "lost";

type FollowupState = "overdue" | "today" | "upcoming" | "future" | "none";

function followupState(dateStr: string | null): FollowupState {
  if (!dateStr) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "upcoming";
  return "future";
}

function rowHighlightClass(state: FollowupState): string {
  switch (state) {
    case "overdue":
      return "border-l-4 border-l-[#C8332B] bg-[#fdeceb]";
    case "today":
      return "border-l-4 border-l-[#E0A82E] bg-[#fdf6e9]";
    case "upcoming":
      return "border-l-4 border-l-[#E0A82E]/60";
    case "future":
      return "border-l-4 border-l-black/15";
    default:
      return "";
  }
}

function statusColor(status: string | null): string {
  switch (status) {
    case "Won":
      return "bg-[#E7F6EE] text-[#1B7A47]";
    case "Lost":
    case "Not a fit":
      return "bg-[#F0F0F2] text-[#86868B]";
    case "Meeting booked":
    case "Proposal sent":
      return "bg-[rgba(189,138,44,0.14)] text-[#8A6418]";
    case "Contacted":
    case "Interested":
      return "bg-[#FDF1E0] text-[#9A6A1A]";
    default:
      return "bg-[#EEF0F3] text-[#5A5A5F]";
  }
}

function targetColor(target: string | null): string {
  if (target === "Yes") return "bg-[#E7F6EE] text-[#1B7A47]";
  if (target === "Maybe") return "bg-[#FDF1E0] text-[#9A6A1A]";
  if (target === "No") return "bg-[#F0F0F2] text-[#86868B]";
  return "bg-[#EEF0F3] text-[#5A5A5F]";
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(`${s}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export default function ProspectsClient() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [editing, setEditing] = useState<Prospect | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prospects/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = (await res.json()) as { prospects: Prospect[] };
      setProspects(data.prospects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (filter === "followup") {
        const s = followupState(p.follow_up_date);
        if (s !== "overdue" && s !== "today" && s !== "upcoming") return false;
      }
      if (filter === "target" && p.target !== "Yes" && p.target !== "Maybe") {
        return false;
      }
      if (
        filter === "active" &&
        !["Contacted", "Interested", "Meeting booked", "Proposal sent"].includes(
          p.status ?? "",
        )
      ) {
        return false;
      }
      if (filter === "won" && p.status !== "Won") return false;
      if (filter === "lost" && p.status !== "Lost" && p.status !== "Not a fit") {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay =
          (p.club_name || "") +
          " " +
          (p.treasurer_name || "") +
          " " +
          (p.notes || "") +
          " " +
          (p.correspondence || "") +
          " " +
          (p.club_website || "");
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [prospects, filter, search]);

  const stats = useMemo(() => {
    return {
      total: prospects.length,
      followup: prospects.filter((p) => {
        const s = followupState(p.follow_up_date);
        return s === "overdue" || s === "today" || s === "upcoming";
      }).length,
      overdue: prospects.filter(
        (p) => followupState(p.follow_up_date) === "overdue",
      ).length,
      targets: prospects.filter((p) => p.target === "Yes" || p.target === "Maybe")
        .length,
      active: prospects.filter((p) =>
        ["Contacted", "Interested", "Meeting booked", "Proposal sent"].includes(
          p.status ?? "",
        ),
      ).length,
      won: prospects.filter((p) => p.status === "Won").length,
    };
  }, [prospects]);

  async function saveField(id: string, field: keyof Prospect, value: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      const data = (await res.json()) as { prospect: Prospect };
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? data.prospect : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusyId(null);
    }
  }

  async function saveAll(id: string, updates: Partial<Prospect>): Promise<boolean> {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      const data = (await res.json()) as { prospect: Prospect };
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? data.prospect : p)),
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newClubName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ club_name: newClubName.trim(), status: "New" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create failed (${res.status})`);
      }
      setNewClubName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(p: Prospect) {
    if (!confirm(`Delete prospect "${p.club_name}"?`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/prospects/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      setProspects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-5">
        <Stat label="Total clubs" value={String(stats.total)} />
        <Stat
          label={`Needs follow-up${stats.overdue > 0 ? ` (${stats.overdue} overdue)` : ""}`}
          value={String(stats.followup)}
          tone={stats.overdue > 0 ? "red" : "amber"}
        />
        <Stat label="Targets" value={String(stats.targets)} highlight />
        <Stat label="Active in pipeline" value={String(stats.active)} />
        <Stat label="Won" value={String(stats.won)} tone="emerald" />
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6e6e73]">
              Add club
            </span>
            <input
              className={inputClass + " min-w-[260px]"}
              placeholder="Club name"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={creating || !newClubName.trim()}
            className="rounded-md gold-bg px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </form>

        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6e6e73]">
              Search
            </span>
            <input
              className={inputClass + " min-w-[200px]"}
              placeholder="Name, treasurer, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6e6e73]">
              Filter
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className={inputClass + " min-w-[180px]"}
            >
              <option value="all">All ({prospects.length})</option>
              <option value="followup">Needs follow-up ({stats.followup})</option>
              <option value="target">Targets ({stats.targets})</option>
              <option value="active">Active ({stats.active})</option>
              <option value="won">Won ({stats.won})</option>
              <option value="lost">Lost / not a fit</option>
            </select>
          </label>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-black/10 px-3 py-2 text-xs text-[#6e6e73] hover:border-gold hover:text-gold"
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-4 py-3 text-sm text-[#C8332B]">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[#86868b]">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#86868b]">
            {prospects.length === 0
              ? "No prospects yet. Add the first one above."
              : "Nothing matches the filter / search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1700px] text-xs">
              <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
                <tr>
                  <Th>Actions</Th>
                  <Th>Follow up</Th>
                  <Th>Club</Th>
                  <Th>Website</Th>
                  <Th>Site quality</Th>
                  <Th>Site function</Th>
                  <Th>Players</Th>
                  <Th>Paid umpires</Th>
                  <Th>Treasurer</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Target</Th>
                  <Th>Status</Th>
                  <Th>Assigned</Th>
                  <Th>Date emailed</Th>
                  <Th>Last contact</Th>
                  <Th>Next action</Th>
                  <Th>Correspondence</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const fState = followupState(p.follow_up_date);
                  return (
                  <tr
                    key={p.id}
                    className={
                      "border-t border-black/10 align-top hover:bg-[#fafafa] " +
                      rowHighlightClass(fState) + " " +
                      (busyId === p.id ? "opacity-60" : "")
                    }
                  >
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold hover:bg-gold/20"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="rounded px-1 text-[#86868b] hover:text-[#C8332B]"
                          aria-label="Delete prospect"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <FollowupCell
                        value={p.follow_up_date ?? ""}
                        state={fState}
                        onSave={(v) => saveField(p.id, "follow_up_date", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.club_name}
                        onSave={(v) => saveField(p.id, "club_name", v)}
                        bold
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.club_website ?? ""}
                        onSave={(v) => saveField(p.id, "club_website", v)}
                        link
                      />
                    </Td>
                    <Td>
                      <SelectCell
                        value={p.website_quality ?? ""}
                        options={QUALITY_OPTIONS}
                        onSave={(v) => saveField(p.id, "website_quality", v)}
                      />
                    </Td>
                    <Td>
                      <SelectCell
                        value={p.website_functionality ?? ""}
                        options={QUALITY_OPTIONS}
                        onSave={(v) =>
                          saveField(p.id, "website_functionality", v)
                        }
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.approx_players ?? ""}
                        onSave={(v) => saveField(p.id, "approx_players", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.paid_umpires ?? ""}
                        onSave={(v) => saveField(p.id, "paid_umpires", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.treasurer_name ?? ""}
                        onSave={(v) => saveField(p.id, "treasurer_name", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.treasurer_email ?? ""}
                        onSave={(v) => saveField(p.id, "treasurer_email", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.treasurer_phone ?? ""}
                        onSave={(v) => saveField(p.id, "treasurer_phone", v)}
                      />
                    </Td>
                    <Td>
                      <SelectCell
                        value={p.target ?? ""}
                        options={TARGET_OPTIONS}
                        badgeClass={targetColor(p.target)}
                        onSave={(v) => saveField(p.id, "target", v)}
                      />
                    </Td>
                    <Td>
                      <SelectCell
                        value={p.status ?? ""}
                        options={STATUS_OPTIONS}
                        badgeClass={statusColor(p.status)}
                        onSave={(v) => saveField(p.id, "status", v)}
                      />
                    </Td>
                    <Td>
                      <SelectCell
                        value={p.assigned_to ?? ""}
                        options={ASSIGNEE_OPTIONS}
                        onSave={(v) => saveField(p.id, "assigned_to", v)}
                      />
                    </Td>
                    <Td>
                      <DateCell
                        value={p.date_emailed ?? ""}
                        onSave={(v) => saveField(p.id, "date_emailed", v)}
                      />
                    </Td>
                    <Td>
                      <DateCell
                        value={p.last_contacted ?? ""}
                        onSave={(v) => saveField(p.id, "last_contacted", v)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.next_action ?? ""}
                        onSave={(v) => saveField(p.id, "next_action", v)}
                      />
                    </Td>
                    <Td>
                      <TruncCell
                        value={p.correspondence ?? ""}
                        onOpen={() => setEditing(p)}
                      />
                    </Td>
                    <Td>
                      <EditCell
                        value={p.notes ?? ""}
                        onSave={(v) => saveField(p.id, "notes", v)}
                        multiline
                      />
                    </Td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[#86868b]">
        Tip: click the gold <span className="text-gold">✎ Edit</span> button on
        any row for the full edit panel, or click a single cell for a quick
        change.
      </p>

      {editing && (
        <EditDrawer
          prospect={editing}
          onClose={() => setEditing(null)}
          onSave={async (updates) => {
            const ok = await saveAll(editing.id, updates);
            if (ok) setEditing(null);
          }}
          busy={busyId === editing.id}
        />
      )}
    </div>
  );
}

// ── Edit drawer ──
function EditDrawer({
  prospect,
  onClose,
  onSave,
  busy,
}: {
  prospect: Prospect;
  onClose: () => void;
  onSave: (updates: Partial<Prospect>) => void | Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<Prospect>(prospect);

  useEffect(() => {
    setForm(prospect);
  }, [prospect]);

  function set<K extends keyof Prospect>(k: K, v: Prospect[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function diff(): Partial<Prospect> {
    const out: Partial<Prospect> = {};
    const keys: (keyof Prospect)[] = [
      "club_name",
      "club_website",
      "website_quality",
      "website_functionality",
      "approx_players",
      "paid_umpires",
      "treasurer_name",
      "treasurer_email",
      "treasurer_phone",
      "target",
      "notes",
      "status",
      "assigned_to",
      "last_contacted",
      "next_action",
      "date_emailed",
      "correspondence",
      "follow_up_date",
    ];
    for (const k of keys) {
      if ((form[k] ?? "") !== (prospect[k] ?? "")) {
        (out as Record<string, unknown>)[k] = form[k] ?? "";
      }
    }
    return out;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-sm"
      />
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-black/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-black/10 px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold">
              Edit prospect
            </p>
            <h2 className="mt-1 text-xl font-bold">{prospect.club_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-[#86868b] hover:text-[#1d1d1f]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const updates = diff();
            if (Object.keys(updates).length === 0) {
              onClose();
              return;
            }
            await onSave(updates);
          }}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          <Section title="Club">
            <Field label="Club name">
              <input
                className={drawerInputClass}
                value={form.club_name}
                onChange={(e) => set("club_name", e.target.value)}
                required
              />
            </Field>
            <Field label="Website">
              <input
                className={drawerInputClass}
                value={form.club_website ?? ""}
                onChange={(e) => set("club_website", e.target.value)}
                placeholder="www.example.com"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site quality">
                <Select
                  value={form.website_quality ?? ""}
                  options={QUALITY_OPTIONS}
                  onChange={(v) => set("website_quality", v)}
                />
              </Field>
              <Field label="Site functionality">
                <Select
                  value={form.website_functionality ?? ""}
                  options={QUALITY_OPTIONS}
                  onChange={(v) => set("website_functionality", v)}
                />
              </Field>
              <Field label="Approx players">
                <input
                  className={drawerInputClass}
                  value={form.approx_players ?? ""}
                  onChange={(e) => set("approx_players", e.target.value)}
                />
              </Field>
              <Field label="Paid umpires">
                <input
                  className={drawerInputClass}
                  value={form.paid_umpires ?? ""}
                  onChange={(e) => set("paid_umpires", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Treasurer name">
                <input
                  className={drawerInputClass}
                  value={form.treasurer_name ?? ""}
                  onChange={(e) => set("treasurer_name", e.target.value)}
                />
              </Field>
              <Field label="Treasurer phone">
                <input
                  className={drawerInputClass}
                  value={form.treasurer_phone ?? ""}
                  onChange={(e) => set("treasurer_phone", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Treasurer email">
              <input
                className={drawerInputClass}
                type="email"
                value={form.treasurer_email ?? ""}
                onChange={(e) => set("treasurer_email", e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Sales pipeline">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Target">
                <Select
                  value={form.target ?? ""}
                  options={TARGET_OPTIONS}
                  onChange={(v) => set("target", v)}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status ?? ""}
                  options={STATUS_OPTIONS}
                  onChange={(v) => set("status", v)}
                />
              </Field>
              <Field label="Assigned to">
                <Select
                  value={form.assigned_to ?? ""}
                  options={ASSIGNEE_OPTIONS}
                  onChange={(v) => set("assigned_to", v)}
                />
              </Field>
              <Field label="Date emailed">
                <input
                  type="date"
                  className={drawerInputClass}
                  value={form.date_emailed ?? ""}
                  onChange={(e) => set("date_emailed", e.target.value)}
                />
              </Field>
              <Field label="Follow-up date">
                <div className="flex items-stretch gap-2">
                  <input
                    type="date"
                    className={drawerInputClass + " flex-1"}
                    value={form.follow_up_date ?? ""}
                    onChange={(e) => set("follow_up_date", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => set("follow_up_date", "")}
                    disabled={!form.follow_up_date}
                    className="rounded-md border border-black/10 px-2 text-[10px] uppercase tracking-wider text-[#6e6e73] hover:border-gold hover:text-gold disabled:opacity-30"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-[#86868b]">
                  Set this to flag the row for follow-up. Overdue = red, within 7 days = amber.
                </p>
              </Field>
              <Field label="Last contacted">
                <input
                  type="date"
                  className={drawerInputClass}
                  value={form.last_contacted ?? ""}
                  onChange={(e) => set("last_contacted", e.target.value)}
                />
              </Field>
              <Field label="Next action">
                <input
                  className={drawerInputClass}
                  value={form.next_action ?? ""}
                  onChange={(e) => set("next_action", e.target.value)}
                  placeholder="e.g. Follow-up call Thu"
                />
              </Field>
            </div>
            <Field label="Correspondence log">
              <textarea
                rows={8}
                className={drawerInputClass + " font-mono text-[12px]"}
                value={form.correspondence ?? ""}
                onChange={(e) => set("correspondence", e.target.value)}
                placeholder={
                  "Running log of emails / calls / meetings.\n\n" +
                  "Example:\n" +
                  "4 Jun 26 — Sent intro email to Peter (treasurer)\n" +
                  "11 Jun 26 — Replied: interested, asked for pricing\n" +
                  "12 Jun 26 — Replied with pricing + Seaforth link"
                }
              />
              <div className="mt-1 flex items-center justify-between text-[10px] text-[#86868b]">
                <span>Append new entries to the top with a date prefix.</span>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    });
                    const prefix = `${today} — `;
                    set(
                      "correspondence",
                      prefix + (form.correspondence ? "\n" + form.correspondence : ""),
                    );
                  }}
                  className="rounded border border-black/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#6e6e73] hover:border-gold hover:text-gold"
                >
                  + Today
                </button>
              </div>
            </Field>
          </Section>

          <Section title="Notes">
            <Field label="Internal notes">
              <textarea
                rows={4}
                className={drawerInputClass}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </Section>

          <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-3 border-t border-black/10 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/10 px-4 py-2 text-xs uppercase tracking-wider text-[#3a3a3c] hover:border-black/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md gold-bg px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-[10px] uppercase tracking-[0.25em] text-gold">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-[#6e6e73]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      className={drawerInputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── inline-cell helpers (unchanged behaviour) ──
const inputClass =
  "w-full rounded-[10px] border border-black/15 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#BD8A2C]";

const cellInputClass =
  "block w-full rounded border border-gold bg-white px-2 py-1 text-xs text-[#1d1d1f] outline-none";

const drawerInputClass =
  "w-full rounded-[10px] border border-black/15 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#BD8A2C]";

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-3 text-left">{children}</th>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-3 py-2 text-left">{children}</td>;
}

function EditCell({
  value,
  onSave,
  bold = false,
  link = false,
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  bold?: boolean;
  link?: boolean;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }
  function cancel() {
    setEditing(false);
    setDraft(value);
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          rows={3}
          className={cellInputClass + " min-w-[220px]"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
        />
      );
    }
    return (
      <input
        autoFocus
        className={cellInputClass + " min-w-[140px]"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter") commit();
        }}
      />
    );
  }

  const display = value.trim() || "—";
  const isEmpty = !value.trim();
  const baseClass =
    "block cursor-text rounded px-1 py-0.5 hover:bg-[#f5f5f7] " +
    (bold ? "font-semibold text-[#1d1d1f] " : "text-[#3a3a3c] ") +
    (isEmpty ? "text-[#86868b]" : "");

  if (link && !isEmpty) {
    const href = value.startsWith("http") ? value : `https://${value}`;
    return (
      <div className="flex items-center gap-1">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-gold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] text-[#86868b] hover:text-[#3a3a3c]"
          aria-label="Edit"
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={baseClass + " text-left whitespace-pre-wrap"}
    >
      {display}
    </button>
  );
}

function SelectCell({
  value,
  options,
  onSave,
  badgeClass,
}: {
  value: string;
  options: readonly string[];
  onSave: (v: string) => void;
  badgeClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <select
        autoFocus
        className={cellInputClass}
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  const display = value || "—";
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={
        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
        (badgeClass ?? "bg-[#EEF0F3] text-[#5A5A5F]") +
        (value ? "" : " text-[#86868b]")
      }
    >
      {display}
    </button>
  );
}

function DateCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        className={cellInputClass}
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={
        "block rounded px-1 py-0.5 hover:bg-[#f5f5f7] " +
        (value ? "text-[#3a3a3c]" : "text-[#86868b]")
      }
    >
      {fmtDate(value || null)}
    </button>
  );
}

function FollowupCell({
  value,
  state,
  onSave,
}: {
  value: string;
  state: FollowupState;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        className={cellInputClass}
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      />
    );
  }
  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#86868b] hover:bg-[#f5f5f7] hover:text-gold"
        title="Set a follow-up date to flag this row"
      >
        + Flag
      </button>
    );
  }
  const tone =
    state === "overdue"
      ? "bg-[#FBE9E7] text-[#C8332B] border border-[#C8332B]/30"
      : state === "today"
        ? "bg-[#FDF1E0] text-[#9A6A1A] border border-[#9A6A1A]/30"
        : state === "upcoming"
          ? "bg-[#FDF1E0] text-[#9A6A1A] border border-[#9A6A1A]/20"
          : "bg-[#F0F0F2] text-[#86868B] border border-black/10";
  const label =
    state === "overdue"
      ? "Overdue"
      : state === "today"
        ? "Today"
        : state === "upcoming"
          ? "Soon"
          : "Set";
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={"flex flex-col items-start rounded-md px-2 py-1 text-[10px] " + tone}
      title="Click to change follow-up date"
    >
      <span className="text-[9px] font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[11px]">{fmtDate(value)}</span>
    </button>
  );
}

function TruncCell({
  value,
  onOpen,
}: {
  value: string;
  onOpen: () => void;
}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="block rounded px-1 py-0.5 text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#3a3a3c]"
      >
        — add log
      </button>
    );
  }
  // Show only the first line, truncated
  const firstLine = trimmed.split("\n")[0];
  const preview =
    firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
  const lineCount = trimmed.split("\n").filter((l) => l.trim()).length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block max-w-[260px] rounded px-1 py-0.5 text-left text-[#3a3a3c] hover:bg-[#f5f5f7]"
      title={trimmed}
    >
      <span className="block truncate">{preview}</span>
      {lineCount > 1 && (
        <span className="text-[10px] text-[#86868b]">
          + {lineCount - 1} more entr{lineCount - 1 === 1 ? "y" : "ies"}
        </span>
      )}
    </button>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "emerald" | "amber" | "red";
}) {
  const cls =
    tone === "emerald"
      ? "text-[#1B7A47]"
      : tone === "red"
        ? "text-[#C8332B]"
        : tone === "amber"
          ? "text-[#9A6A1A]"
          : highlight
            ? "text-gold"
            : "text-[#1d1d1f]";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#86868b]">
        {label}
      </div>
      <div className={"mt-1 text-2xl font-bold " + cls}>{value}</div>
    </div>
  );
}
