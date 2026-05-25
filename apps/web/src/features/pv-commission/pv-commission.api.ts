/**
 * PV Commission Rokhas — client API
 *
 * Wrappers typés autour de /api/pv-commission/*.
 * Réutilise apiFetch + getToken du tome4/apiClient.
 */
import { apiBase, apiFetch, getToken } from "../../tomes/tome4/apiClient";

export type DecisionCommission =
  | "FAVORABLE"
  | "FAVORABLE_AVEC_RESERVES"
  | "DEFAVORABLE"
  | "AJOURNE";

export type PvStatus = "UPLOADED" | "PARSING" | "PARSED" | "VALIDATED" | "ARCHIVED";
export type ReserveSeverite = "MINEURE" | "MAJEURE" | "BLOQUANTE";
export type ReserveStatus = "OUVERTE" | "EN_COURS" | "LEVEE" | "FORCLOSE";

export type PvMotifRefus = { titre: string; articleLoi?: string | null; description: string };

export type PvReserve = {
  id: string;
  ordre: number;
  titre: string;
  description: string;
  articleLoi: string | null;
  severite: ReserveSeverite;
  deadlineLevee: string | null;
  status: ReserveStatus;
  preuveUrl: string | null;
  leveeAt: string | null;
  leveeBy: string | null;
  joursRestants: number | null;
};

export type PvCommission = {
  id: string;
  dossierId: string;
  rokhasReference: string | null;
  uploadedFileUrl: string;
  uploadedAt: string;
  parsedAt: string | null;
  parsedBy: string | null;
  dateCommission: string | null;
  communeName: string | null;
  presents: string[];
  decision: DecisionCommission | null;
  motifsRefus: PvMotifRefus[];
  reserves: PvReserve[];
  delaiLegalReponseDays: number;
  status: PvStatus;
  hashSha256: string;
  parserVersion: string | null;
  parsingConfidence: number | null;
};

export type WorkflowOutcome = {
  decision: DecisionCommission;
  actionsTriggered: string[];
  notifications: number;
  tasksCreated: number;
  incidentId?: string;
};

// ── List / Get ──────────────────────────────────────────────────────────────

export function listPvsByDossier(dossierId: string) {
  return apiFetch<{ ok: true; count: number; items: PvCommission[] }>(
    `/api/pv-commission/dossier/${encodeURIComponent(dossierId)}`,
  );
}

export function getPv(pvId: string) {
  return apiFetch<{ ok: true; pv: PvCommission }>(`/api/pv-commission/${encodeURIComponent(pvId)}`);
}

// ── Upload (multipart, hors apiFetch JSON) ──────────────────────────────────

export async function uploadPv(dossierId: string, file: File): Promise<{ ok: true; pv: PvCommission }> {
  const fd = new FormData();
  fd.append("file", file);
  const token = getToken();
  const url = `${apiBase()}/api/pv-commission/upload/${encodeURIComponent(dossierId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload échoué (${res.status}): ${txt || res.statusText}`);
  }
  return res.json();
}

// ── Parse ───────────────────────────────────────────────────────────────────

export function parsePv(pvId: string) {
  return apiFetch<{ ok: true; pv: PvCommission; workflow: WorkflowOutcome | null }>(
    `/api/pv-commission/${encodeURIComponent(pvId)}/parse`,
    { method: "POST" },
  );
}

// ── Lever réserve ───────────────────────────────────────────────────────────

export function leverReserve(pvId: string, reserveId: string, body: { preuveUrl: string; note?: string }) {
  return apiFetch<{ ok: true; pv: PvCommission }>(
    `/api/pv-commission/${encodeURIComponent(pvId)}/reserves/${encodeURIComponent(reserveId)}/lever`,
    { method: "POST", body },
  );
}

// ── PDF URL helper ──────────────────────────────────────────────────────────

export function pdfUrl(pvId: string): string {
  return `${apiBase()}/api/pv-commission/${encodeURIComponent(pvId)}/pdf`;
}

// ── Upload preuve (réutilise /p5/documents/upload qui est public) ───────────

export async function uploadPreuve(file: File): Promise<{ ok: true; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const url = `${apiBase()}/p5/documents/upload`;
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload preuve échoué (${res.status})`);
  return res.json();
}
