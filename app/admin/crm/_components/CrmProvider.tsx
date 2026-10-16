"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/crm/client";
import { buildIndexes, clubView, type ClubView, type Indexes } from "@/lib/crm/derive";
import { todayISO } from "@/lib/crm/normalise";
import type { Snapshot } from "@/lib/crm/types";

type Ctx = {
  snap: Snapshot | null;
  ix: Indexes | null;
  views: Map<string, ClubView>;
  loading: boolean;
  error: string | null;
  today: string;
  reload: () => Promise<void>;
  /** Open the club / person drawers from anywhere (synced to ?club= / ?person=). */
  openClub: (id: string | null) => void;
  openPerson: (id: string | null) => void;
  clubId: string | null;
  personId: string | null;
  /** Bumped after any write so open panels refetch their detail. */
  version: number;
};

const CrmContext = createContext<Ctx | null>(null);

export function useCrm(): Ctx {
  const c = useContext(CrmContext);
  if (!c) throw new Error("useCrm outside CrmProvider");
  return c;
}

function setParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const today = todayISO();

  const reload = useCallback(async () => {
    try {
      setError(null);
      const s = await api.snapshot<Snapshot>();
      setSnap(s);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the CRM");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const p = new URLSearchParams(window.location.search);
    setClubId(p.get("club"));
    setPersonId(p.get("person"));
  }, [reload]);

  const openClub = useCallback((id: string | null) => {
    setClubId(id);
    setParam("club", id);
  }, []);
  const openPerson = useCallback((id: string | null) => {
    setPersonId(id);
    setParam("person", id);
  }, []);

  const ix = useMemo(() => (snap ? buildIndexes(snap) : null), [snap]);
  const views = useMemo(() => {
    const m = new Map<string, ClubView>();
    if (snap && ix) for (const c of snap.clubs) m.set(c.id, clubView(c, ix, today));
    return m;
  }, [snap, ix, today]);

  const value: Ctx = { snap, ix, views, loading, error, today, reload, openClub, openPerson, clubId, personId, version };
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}
