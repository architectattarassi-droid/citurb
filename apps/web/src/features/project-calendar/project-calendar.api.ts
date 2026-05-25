/**
 * Project Calendar — client API web.
 * Wraps fetch + JWT auth (apiFetch) pour le module Calendrier Projet.
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

export type ProjectPhase =
  | "ESQ" | "APS" | "APD" | "DCE" | "DAO" | "MARCHE" | "EXEC" | "RECEPTION" | "GPA";

export type ProjectTaskStatus =
  | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "CANCELED";

export type ProjectTask = {
  id: string;
  dossierId: string;
  parentId?: string | null;
  numero: string;
  titre: string;
  description?: string | null;
  phase: ProjectPhase;
  startAt?: string | null;
  endAt?: string | null;
  durationDays: number;
  progressPct: number;
  isMilestone: boolean;
  isCritical: boolean;
  predecessors: string[];
  resourceUserIds: string[];
  resourceSupplierIds: string[];
  status: ProjectTaskStatus;
  blockers: Array<{ type: string; payload?: any; since: string }>;
  createdAt: string;
  updatedAt: string;
};

export type CpmResult = {
  criticalPath: string[];
  projectDuration: number;
  slackPerTask: Record<string, number>;
  schedule: Record<string, {
    earliestStart: number; earliestFinish: number;
    latestStart: number; latestFinish: number;
    slack: number; isCritical: boolean;
  }>;
};

export type GanttBar = {
  taskId: string; numero: string; titre: string; phase: ProjectPhase;
  startDay: number; endDay: number; durationDays: number;
  progressPct: number; isCritical: boolean; isMilestone: boolean;
  status: ProjectTaskStatus; predecessors: string[];
};

export type GanttPayload = {
  projectStart: string | null; projectEnd: string | null;
  projectDuration: number; bars: GanttBar[];
  phases: Array<{ phase: ProjectPhase; startDay: number; endDay: number; count: number }>;
};

const base = (dossierId: string) => `/api/project-calendar/${encodeURIComponent(dossierId)}`;

export const projectCalendarApi = {
  listTasks: (dossierId: string) =>
    apiFetch<{ ok: true; tasks: ProjectTask[] }>(`${base(dossierId)}/tasks`),

  createTask: (dossierId: string, body: Partial<ProjectTask>) =>
    apiFetch<{ ok: true; task: ProjectTask }>(`${base(dossierId)}/tasks`, { method: "POST", body }),

  patchTask: (dossierId: string, taskId: string, body: Partial<ProjectTask>) =>
    apiFetch<{ ok: true; task: ProjectTask }>(`${base(dossierId)}/tasks/${taskId}`, { method: "PATCH", body }),

  deleteTask: (dossierId: string, taskId: string) =>
    apiFetch<{ ok: true; deletedId: string }>(`${base(dossierId)}/tasks/${taskId}`, { method: "DELETE" }),

  initFromTemplate: (dossierId: string, porte: "P2" | "P3" | "P4" | "P5", opts: { resetExisting?: boolean; projectStart?: string } = {}) =>
    apiFetch<{ ok: true; createdCount: number; tasks: ProjectTask[] }>(
      `${base(dossierId)}/init-from-template?porte=${porte}`,
      { method: "POST", body: opts },
    ),

  criticalPath: (dossierId: string) =>
    apiFetch<{ ok: true } & CpmResult>(`${base(dossierId)}/critical-path`),

  gantt: (dossierId: string) =>
    apiFetch<{ ok: true } & GanttPayload>(`${base(dossierId)}/gantt`),

  replanCascade: (dossierId: string, fromTaskId: string, deltaDays: number) =>
    apiFetch<{ ok: true; impacted: string[] }>(
      `${base(dossierId)}/replan-cascade?fromTaskId=${encodeURIComponent(fromTaskId)}&deltaDays=${deltaDays}`,
      { method: "POST" },
    ),
};

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  ESQ: "Esquisse",
  APS: "Avant-projet sommaire",
  APD: "Avant-projet détaillé",
  DCE: "Dossier consultation",
  DAO: "Appel d'offres",
  MARCHE: "Passation marché",
  EXEC: "Exécution",
  RECEPTION: "Réception",
  GPA: "Garantie",
};

export const PHASE_COLORS: Record<ProjectPhase, string> = {
  ESQ: "#7c3aed",
  APS: "#6d28d9",
  APD: "#4f46e5",
  DCE: "#0ea5e9",
  DAO: "#0891b2",
  MARCHE: "#059669",
  EXEC: "#16a34a",
  RECEPTION: "#ca8a04",
  GPA: "#9a3412",
};

export const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  PENDING: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  BLOCKED: "Bloquée",
  CANCELED: "Annulée",
};

/**
 * Conversion Grégorien → Hijri approximative (algorithme tabulaire).
 * Précision suffisante pour overlay calendrier (±1 jour parfois).
 * Évite une lib externe pour le MVP.
 */
export function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const jd = gregorianToJulianDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

function gregorianToJulianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

export const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabī' I", "Rabī' II", "Jumādā I", "Jumādā II",
  "Rajab", "Sha'bān", "Ramadan", "Shawwāl", "Dhū al-Qa'da", "Dhū al-Hijja",
];
