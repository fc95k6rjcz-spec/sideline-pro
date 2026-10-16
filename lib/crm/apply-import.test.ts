import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyImport } from "@/lib/crm/apply-import";
import { autoMap, planImport } from "@/lib/crm/import";
import type { Snapshot } from "@/lib/crm/types";

// ---------- a tiny in-memory stand-in for the Supabase query builder ----------
// Supports exactly what apply-import uses, and enforces the contact-point
// uniqueness rule the real table has, so duplicate handling is exercised.

type Row = Record<string, unknown>;
let seq = 0;
const uid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function fakeDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  const t = (name: string) => (tables[name] ??= []);

  class Q {
    private filters: ((r: Row) => boolean)[] = [];
    private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    private payload: Row | Row[] | null = null;
    private mode: "many" | "single" | "maybe" = "many";
    private opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    constructor(private name: string) {}
    select() { return this; }
    insert(p: Row | Row[]) { this.op = "insert"; this.payload = p; return this; }
    update(p: Row) { this.op = "update"; this.payload = p; return this; }
    upsert(p: Row, o: Q["opts"]) { this.op = "upsert"; this.payload = p; this.opts = o; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
    in(c: string, v: unknown[]) { this.filters.push((r) => v.includes(r[c])); return this; }
    ilike(c: string, v: string) { this.filters.push((r) => String(r[c]).toLowerCase() === v.toLowerCase()); return this; }
    single() { this.mode = "single"; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    then<T>(res: (v: { data: unknown; error: { code?: string; message: string } | null }) => T) {
      return Promise.resolve(res(this.run()));
    }
    private run(): { data: unknown; error: { code?: string; message: string } | null } {
      const rows = t(this.name);
      const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "insert") {
        const list: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({ id: uid(), ...r }));
        if (this.name === "crm_contact_points") {
          for (const r of list) {
            const dup = rows.some((x) => x.kind === r.kind && x.value_norm === r.value_norm && (x.person_id ?? null) === (r.person_id ?? null) && (x.club_id ?? null) === (r.club_id ?? null));
            if (dup) return { data: null, error: { code: "23505", message: "duplicate" } };
          }
        }
        rows.push(...list);
        return { data: this.mode === "many" ? list : list[0], error: null };
      }
      if (this.op === "upsert") {
        const keys = (this.opts.onConflict ?? "id").split(",");
        const p = this.payload as Row;
        const ex = rows.find((r) => keys.every((k) => r[k] === p[k]));
        if (ex) { if (!this.opts.ignoreDuplicates) Object.assign(ex, p); }
        else rows.push({ ...p });
        return { data: ex ?? p, error: null };
      }
      if (this.op === "update") {
        const m = match();
        for (const r of m) Object.assign(r, this.payload);
        return { data: this.mode === "many" ? m : m[0] ?? null, error: null };
      }
      const m = match();
      if (this.mode === "single") return m[0] ? { data: m[0], error: null } : { data: null, error: { message: "not found" } };
      if (this.mode === "maybe") return { data: m[0] ?? null, error: null };
      return { data: m, error: null };
    }
  }
  return { client: { from: (n: string) => new Q(n) } as unknown as SupabaseClient, tables };
}

// ---------- fixture: Queenscliff with a current treasurer ----------

const C1 = "11111111-1111-4111-8111-111111111111";
const P1 = "22222222-2222-4222-8222-222222222222";
const AP1 = "33333333-3333-4333-8333-333333333333";
const A1 = "44444444-4444-4444-8444-444444444444";
const base = { source_url: null, source_note: null, verified_on: "2026-06-03", created_at: "", updated_at: "" };

const seed = () => ({
  crm_associations: [{ ...base, id: A1, name: "Manly Warringah Netball Association", short_name: "MWNA" }],
  crm_clubs: [{ ...base, id: C1, name: "Queenscliff Netball Club", aliases: [], social_links: {}, stage: "ready", website: "www.queenscliffnetball.asn.au", suburb: null }],
  crm_club_associations: [{ club_id: C1, association_id: A1, verification: "unverified" }],
  crm_people: [{ ...base, id: P1, full_name: "Brigette Bankes", background_tags: [], verification: "verified" }],
  crm_appointments: [{ ...base, id: AP1, club_id: C1, person_id: P1, role_category: "treasurer", status: "current", purchase_roles: [], verification: "verified" }],
  crm_contact_points: [{ ...base, id: "55555555-5555-4555-8555-555555555555", club_id: C1, person_id: P1, kind: "email", value: "qnctreasurer@gmail.com", value_norm: "qnctreasurer@gmail.com", inbox_type: "role", role_category: "treasurer", status: "active", verification: "verified" }],
});

function snapshotOf(tables: Record<string, Row[]>): Snapshot {
  return {
    associations: tables.crm_associations, clubs: tables.crm_clubs, clubAssociations: tables.crm_club_associations,
    people: tables.crm_people, appointments: tables.crm_appointments, contactPoints: tables.crm_contact_points,
    tasks: [], activities: [], suppressions: [], audiences: [],
  } as unknown as Snapshot;
}

const headers = ["Club", "Association", "Name", "Role", "Email", "Suburb", "Website", "Source URL", "Date checked"];
const meta = { filename: "test.csv", sourceLabel: "Test sheet", mapping: {}, actor: "test@sidelinepro.com.au" };

describe("applyImport", () => {
  it("records a committee change without losing the previous treasurer", async () => {
    const { client, tables } = fakeDb(seed());
    const plan = planImport(
      { headers, rows: [["Queenscliff Netball Club", "MWNA", "Jo Smith", "Treasurer", "jo@example.com", "Queenscliff", "forest.example", "https://qnc.example/committee", "20/10/2026"]] },
      autoMap(headers),
      snapshotOf(tables),
    );
    const rows = plan.rows.map((r) => ({ ...r, contacts: r.contacts.map((c) => ({ ...c, conflictDecision: "handover" as const })) }));
    const res = await applyImport(client, { rows }, meta);

    expect(res.errors).toEqual([]);
    expect(res).toMatchObject({ clubsCreated: 0, clubsUpdated: 1, peopleCreated: 1, appointmentsCreated: 1, handovers: 1 });
    const old = tables.crm_appointments.find((a) => a.id === AP1)!;
    expect(old).toMatchObject({ status: "former", ended_on: "2026-10-20" });
    const fresh = tables.crm_appointments.find((a) => a.id === old.replaced_by_id)!;
    const jo = tables.crm_people.find((p) => p.full_name === "Jo Smith")!;
    expect(fresh).toMatchObject({ person_id: jo.id, status: "current", source_url: "https://qnc.example/committee", verified_on: "2026-10-20" });
    // Brigette is still on file; the role inbox now points at Jo.
    expect(tables.crm_people.some((p) => p.id === P1)).toBe(true);
    expect(tables.crm_contact_points.find((c) => c.value === "qnctreasurer@gmail.com")!.person_id).toBe(jo.id);
    // The blank suburb was filled; the differing website was kept.
    const club = tables.crm_clubs[0];
    expect(club.suburb).toBe("Queenscliff");
    expect(club.website).toBe("www.queenscliffnetball.asn.au");
    // Every write is traceable to the import and its source.
    const log = tables.crm_change_log.filter((l) => l.import_id === res.importId);
    expect(log.length).toBeGreaterThanOrEqual(4);
    expect(log.every((l) => l.source_url === "https://qnc.example/committee")).toBe(true);
  });

  it("is safe to run twice: the second pass adds nothing", async () => {
    const { client, tables } = fakeDb(seed());
    const rows = [
      ["Allambie Netball Club", "MWNA", "Cathy Priebbenow", "Treasurer", "allambietreasurer@gmail.com", "Allambie Heights", "", "", ""],
      ["Allambie Netball Club", "MWNA", "Cathy Priebbenow", "Registrar", "allambietreasurer@gmail.com", "", "", "", ""],
    ];
    const first = planImport({ headers, rows }, autoMap(headers), snapshotOf(tables));
    const r1 = await applyImport(client, first, meta);
    expect(r1).toMatchObject({ clubsCreated: 1, peopleCreated: 1, appointmentsCreated: 2, errors: [] });
    expect(tables.crm_contact_points.filter((c) => c.value_norm === "allambietreasurer@gmail.com")).toHaveLength(1);

    const second = planImport({ headers, rows }, autoMap(headers), snapshotOf(tables));
    expect(second.summary).toMatchObject({ clubsNew: 0, peopleNew: 0, appointmentsNew: 0, contactPointsNew: 0 });
    const r2 = await applyImport(client, second, meta);
    expect(r2).toMatchObject({ clubsCreated: 0, peopleCreated: 0, appointmentsCreated: 0, contactPointsCreated: 0 });
    expect(tables.crm_clubs).toHaveLength(2);
  });

  it("skips a contact when the reviewer says so", async () => {
    const { client, tables } = fakeDb(seed());
    const plan = planImport({ headers, rows: [["Queenscliff Netball Club", "", "Jo Smith", "Treasurer", "", "", "", "", ""]] }, autoMap(headers), snapshotOf(tables));
    const rows = plan.rows.map((r) => ({ ...r, contacts: r.contacts.map((c) => ({ ...c, conflictDecision: "skip" as const })) }));
    const res = await applyImport(client, { rows }, meta);
    expect(res).toMatchObject({ peopleCreated: 0, appointmentsCreated: 0 });
    expect(tables.crm_appointments.find((a) => a.id === AP1)!.status).toBe("current");
  });
});
