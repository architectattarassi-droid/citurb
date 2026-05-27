/**
 * Rokhas Tracker — client API
 *
 * Wrappers typés autour de /api/rokhas-tracker/*.
 * Réutilise apiFetch + getToken du tome4/apiClient.
 */
import { apiBase, apiFetch, getToken } from "../../tomes/tome4/apiClient";

export type ProjectCategory = 1 | 2 | 3;

export type RokhasEventType =
  | "DEPOT"
  | "ACCUSE"
  | "COMMISSION"
  | "AVIS_AU"
  | "AVIS_SERVICES"
  | "VOTE"
  | "DECISION"
  | "RESERVE_AJOUTE"
  | "RESERVE_LEVEE"
  | "DELIVRANCE";

export type RokhasDecisionType =
  | "FAVORABLE"
  | "FAVORABLE_AVEC_RESERVES"
  | "DEFAVORABLE"
  | "AJOURNE";

export type ReserveSeverite = "INFO" | "AVIS" | "RESERVE" | "BLOQUANT";
export type ReserveStatus = "OUVERTE" | "EN_COURS" | "LEVEE" | "FORCLOSE";
export type DeadlineSeverity = "OK" | "WARN" | "CRITICAL" | "OVERDUE";

export interface RokhasEvent {
  id: string;
  type: RokhasEventType;
  date: string;
  createdAt: string;
  payload?: Record<string, any>;
  by?: string;
}

export interface RokhasDecision {
  type: RokhasDecisionType;
  date: string;
  motifsRefus?: Array<{ titre: string; articleLoi?: string; description: string }>;
  pvId?: string;
}

export interface RokhasReserve {
  id: string;
  titre: string;
  description: string;
  articleLoi: string | null;
  severite: ReserveSeverite;
  deadlineLevee: string | null;
  status: ReserveStatus;
  preuveDocId: string | null;
  preuveUrl: string | null;
  leveeAt: string | null;
  leveeBy: string | null;
  joursRestants?: number | null;
}

export interface RokhasDeadline {
  type: "DECISION_LEGALE" | "RESERVE_LEVEE" | "RELANCE_AJOURNE";
  label: string;
  deadline: string;
  joursRestants: number | null;
  severity: DeadlineSeverity;
  reserveId?: string;
}

export interface RokhasInstanceView {
  dossierId: string;
  projectCategory: ProjectCategory;
  depositDate: string;
  refRokhasCommune: string | null;
  events: RokhasEvent[];
  decision: RokhasDecision | null;
  reserves: RokhasReserve[];
  delivranceDate: string | null;
  attestationPdfUrl: string | null;
  updatedAt: string;
  deadlines: RokhasDeadline[];
  decisionDeadline: { deadline: string; joursRestants: number; severity: DeadlineSeverity } | null;
  progressPct: number;
}

// ── Endpoints ───────────────────────────────────────────────────────────────

export function getInstance(dossierId: string) {
  return apiFetch<{ ok: true; instance: RokhasInstanceView | null }>(
    `/api/rokhas-tracker/dossier/${encodeURIComponent(dossierId)}`,
  );
}

export function getDeadlines(dossierId: string) {
  return apiFetch<{ ok: true; count: number; deadlines: RokhasDeadline[] }>(
    `/api/rokhas-tracker/dossier/${encodeURIComponent(dossierId)}/deadlines`,
  );
}

export function registerDepot(
  dossierId: string,
  body: { projectCategory: ProjectCategory; refRokhas?: string | null; date?: string | null },
) {
  return apiFetch<{ ok: true; instance: RokhasInstanceView }>(
    `/api/rokhas-tracker/dossier/${encodeURIComponent(dossierId)}/depot`,
    { method: "POST", body },
  );
}

export function addEvent(
  dossierId: string,
  body: { type: RokhasEventType; date?: string | null; payload?: Record<string, any> },
) {
  return apiFetch<{ ok: true; instance: RokhasInstanceView }>(
    `/api/rokhas-tracker/dossier/${encodeURIComponent(dossierId)}/event`,
    { method: "POST", body },
  );
}

export function leverReserve(
  dossierId: string,
  reserveId: string,
  body: { preuveDocId: string; preuveUrl?: string | null },
) {
  return apiFetch<{ ok: true; instance: RokhasInstanceView }>(
    `/api/rokhas-tracker/dossier/${encodeURIComponent(dossierId)}/reserve/${encodeURIComponent(reserveId)}/lever`,
    { method: "POST", body },
  );
}

/**
 * Upload d'une preuve — réutilise /p5/documents/upload (public) comme
 * pour PvCommissionReservesTracker. Retourne `{ url }` à passer à
 * `leverReserve` comme `preuveDocId`.
 */
export async function uploadPreuve(file: File): Promise<{ ok: true; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const token = getToken();
  const url = `${apiBase()}/p5/documents/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload preuve échoué (${res.status}): ${txt || res.statusText}`);
  }
  return res.json();
}
