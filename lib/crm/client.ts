// Browser-side calls to /api/crm/*. Every helper throws with the server's
// message on failure so forms can show it.

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON error page
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? (text || `Request failed (${res.status})`);
    throw new Error(msg);
  }
  return data as T;
}

export type Entity =
  | "associations" | "clubs" | "people" | "appointments" | "contact_points"
  | "activities" | "tasks" | "audiences" | "suppressions";

export const api = {
  snapshot: <T>() => call<T>("/api/crm/snapshot"),
  clubDetail: <T>(id: string) => call<T>(`/api/crm/club-detail/${id}`),
  create: <T = Record<string, unknown>>(entity: Entity, body: Record<string, unknown>) =>
    call<{ record: T; club?: unknown }>(`/api/crm/${entity}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T = Record<string, unknown>>(entity: Entity, id: string, body: Record<string, unknown>) =>
    call<{ record: T }>(`/api/crm/${entity}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (entity: Entity, id: string) => call<{ ok: true }>(`/api/crm/${entity}/${id}`, { method: "DELETE" }),
  linkAssociation: (body: Record<string, unknown>) =>
    call<{ record: unknown }>("/api/crm/club-associations", { method: "POST", body: JSON.stringify(body) }),
  unlinkAssociation: (clubId: string, associationId: string) =>
    call<{ ok: true }>(`/api/crm/club-associations?club_id=${clubId}&association_id=${associationId}`, { method: "DELETE" }),
  handover: (body: Record<string, unknown>) =>
    call<{ ok: true; summary: string; appointment: { id: string; person_id: string | null } }>("/api/crm/handover", { method: "POST", body: JSON.stringify(body) }),
  commitImport: <T>(body: Record<string, unknown>) =>
    call<T>("/api/crm/import", { method: "POST", body: JSON.stringify(body) }),
};

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
