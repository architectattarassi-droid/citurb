/**
 * features/incidents-chantier/incidents-chantier.api.ts
 *
 * Client REST pour le module Incidents Chantier + SOS (Tome 3).
 * Réutilise le helper apiFetch (JWT + erreurs).
 *
 * Offline-first : les déclarations effectuées hors ligne sont mises en
 * queue dans localStorage (`citurbarea.incidents.queue.v1`) et flushées
 * automatiquement au retour réseau via `flushOfflineQueue()`.
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

// ── Types miroir backend (gardez-les sync) ─────────────────────

export type IncidentChantierType =
  | "ACCIDENT_TRAVAIL"
  | "VOL_CHANTIER"
  | "EFFONDREMENT"
  | "INCENDIE"
  | "INTRUSION"
  | "METEO_DOMMAGE"
  | "LITIGE_VOISINAGE"
  | "NON_CONFORMITE"
  | "AUTRE";

export type IncidentSeverite = "INFO" | "WARN" | "CRITICAL";

export type IncidentStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "SOS_TRIGGERED"
  | "RESOLVED"
  | "ARCHIVED";

export type IncidentGeoloc = {
  lat: number;
  lng: number;
  altitudeM?: number | null;
  accuracyM?: number | null;
  capturedAt?: string | null;
};

export type IncidentPhoto = {
  url: string;
  takenAt?: string | null;
  geoloc?: IncidentGeoloc | null;
};

export type IncidentActionType =
  | "DECLARED"
  | "PHOTO_ADDED"
  | "SOS_TRIGGERED"
  | "FAMILY_NOTIFIED"
  | "LAWYER_NOTIFIED"
  | "OPS_NOTIFIED"
  | "INSURANCE_CONTACTED"
  | "CNSS_DECLARED"
  | "POLICE_REPORT_FILED"
  | "EXPERTISE_REQUESTED"
  | "REPAIR_STARTED"
  | "CHANTIER_SUSPENDED"
  | "CHANTIER_RESUMED"
  | "STATUS_CHANGED"
  | "NOTE"
  | "RESOLVED";

export type IncidentAction = {
  id: string;
  ts: string;
  type: IncidentActionType;
  actorId?: string | null;
  actorRole?: string | null;
  payload?: Record<string, any>;
};

export type IncidentChantier = {
  id: string;
  dossierId: string;
  numero: string;
  type: IncidentChantierType;
  description: string;
  severite: IncidentSeverite;
  status: IncidentStatus;
  photos: IncidentPhoto[];
  geoloc: IncidentGeoloc | null;
  dateConstatation: string;
  dateResolution?: string | null;
  blessesNb?: number | null;
  montantDommageEstimeMad?: number | null;
  montantIndemniseMad?: number | null;
  leconApprise?: string | null;
  actions: IncidentAction[];
  sosTriggered: boolean;
  sosTriggeredAt?: string | null;
  reporterId?: string | null;
  reporterRole?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentDeclaration = {
  type: IncidentChantierType;
  description: string;
  severite?: IncidentSeverite;
  photos?: IncidentPhoto[];
  geoloc?: IncidentGeoloc | null;
  dateConstatation?: string;
  blessesNb?: number;
  montantDommageEstimeMad?: number;
};

export type IncidentTypeDef = {
  code: IncidentChantierType;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
  severityDefault: IncidentSeverite;
  procedure: string[];
  legalText: string;
  autoNotify: string[];
  autoSuspendChantier: boolean;
};

export type EmergencyContact = {
  code: string;
  label: string;
  tel: string;
  email: string | null;
  type: "MEDICAL" | "RESCUE" | "SECURITY" | "ADMINISTRATIVE" | "PLATFORM";
  priority: number;
  available24_7: boolean;
  trigger: string[];
  legalDeadlineHours?: number;
};

export type WeatherDailyForecast = {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  precipProbabilityPct: number;
  windKmh: number;
  weatherCode: number;
  cherguiRisk: boolean;
  rainRisk: boolean;
};

export type WeatherAlert = {
  date: string;
  type: "CHERGUI" | "PLUIE" | "VENT_FORT" | "GEL";
  affectedTasks: string[];
  suggestion: string;
  replanToDate?: string;
};

export type WeatherSuggestion = {
  generatedAt: string;
  forecast: WeatherDailyForecast[];
  alerts: WeatherAlert[];
};

export type SosContacts = {
  famille?: { nom?: string; tel?: string; email?: string };
  avocat?: { nom?: string; tel?: string; email?: string };
  architecte?: { nom?: string; tel?: string; email?: string };
  mod?: { nom?: string; tel?: string; email?: string };
  promoteur?: { nom?: string; tel?: string; email?: string };
};

// ── Client API ─────────────────────────────────────────────────

export const incidentsChantierApi = {
  meta: {
    types: () =>
      apiFetch<{ ok: true; types: IncidentTypeDef[] }>(
        "/api/incidents-chantier/meta/types",
      ),
    emergencyContacts: () =>
      apiFetch<{ ok: true; contacts: EmergencyContact[] }>(
        "/api/incidents-chantier/meta/emergency-contacts",
      ),
  },
  listByDossier: (dossierId: string) =>
    apiFetch<{ ok: true; incidents: IncidentChantier[]; total: number }>(
      `/api/incidents-chantier/dossier/${dossierId}`,
    ),
  get: (incidentId: string) =>
    apiFetch<{ ok: true; incident: IncidentChantier }>(
      `/api/incidents-chantier/${incidentId}`,
    ),
  declare: (dossierId: string, body: IncidentDeclaration) =>
    apiFetch<{ ok: true; incident: IncidentChantier }>(
      `/api/incidents-chantier/dossier/${dossierId}/declarer`,
      { method: "POST", body },
    ),
  addAction: (
    incidentId: string,
    body: { type: IncidentActionType; payload?: Record<string, any> },
  ) =>
    apiFetch<{ ok: true; incident: IncidentChantier }>(
      `/api/incidents-chantier/${incidentId}/action`,
      { method: "POST", body },
    ),
  resolve: (
    incidentId: string,
    body: {
      dateResolution?: string;
      montantIndemniseMad?: number;
      leconApprise?: string;
    },
  ) =>
    apiFetch<{ ok: true; incident: IncidentChantier }>(
      `/api/incidents-chantier/${incidentId}/resolve`,
      { method: "POST", body },
    ),
  sos: (incidentId: string, contacts: SosContacts = {}) =>
    apiFetch<{
      ok: boolean;
      incident: IncidentChantier;
      notifiedCount: number;
      emergencyCodesUsed: string[];
      errors: string[];
    }>(`/api/incidents-chantier/${incidentId}/sos`, {
      method: "POST",
      body: { contacts },
    }),
  weatherAlerts: (dossierId: string, geoloc?: IncidentGeoloc | null) => {
    const q = geoloc
      ? `?lat=${encodeURIComponent(geoloc.lat)}&lng=${encodeURIComponent(geoloc.lng)}`
      : "";
    return apiFetch<{ ok: true; suggestion: WeatherSuggestion | null }>(
      `/api/incidents-chantier/dossier/${dossierId}/weather-alerts${q}`,
    );
  },
  acceptWeatherReplan: (dossierId: string) =>
    apiFetch<{ ok: boolean; replanCount: number; alerts: WeatherAlert[] }>(
      `/api/incidents-chantier/dossier/${dossierId}/weather-replan/accept`,
      { method: "POST" },
    ),
};

// ── Offline-first queue ────────────────────────────────────────

const QUEUE_KEY = "citurbarea.incidents.queue.v1";

type QueuedDeclaration = {
  id: string;
  dossierId: string;
  body: IncidentDeclaration;
  ts: number;
};

export function enqueueDeclaration(
  dossierId: string,
  body: IncidentDeclaration,
): QueuedDeclaration {
  const queue = readQueue();
  const item: QueuedDeclaration = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dossierId,
    body,
    ts: Date.now(),
  };
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function getQueue(): QueuedDeclaration[] {
  return readQueue();
}

export async function flushOfflineQueue(): Promise<{ ok: number; failed: number }> {
  const queue = readQueue();
  if (!queue.length) return { ok: 0, failed: 0 };
  let ok = 0;
  let failed = 0;
  const remaining: QueuedDeclaration[] = [];
  for (const item of queue) {
    try {
      await incidentsChantierApi.declare(item.dossierId, item.body);
      ok++;
    } catch {
      failed++;
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { ok, failed };
}

function readQueue(): QueuedDeclaration[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedDeclaration[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* quota dépassé : on ignore */
  }
}

// ── Helpers ────────────────────────────────────────────────────

export const SEVERITE_COLOR: Record<
  IncidentSeverite,
  { bg: string; fg: string; label: string }
> = {
  INFO: { bg: "#e0f2fe", fg: "#0369a1", label: "Info" },
  WARN: { bg: "#fef3c7", fg: "#92400e", label: "Avertissement" },
  CRITICAL: { bg: "#fecaca", fg: "#991b1b", label: "Critique" },
};

export const STATUS_COLOR: Record<
  IncidentStatus,
  { bg: string; fg: string; label: string }
> = {
  OPEN: { bg: "#e0f2fe", fg: "#0369a1", label: "Ouvert" },
  IN_PROGRESS: { bg: "#fef3c7", fg: "#92400e", label: "En cours" },
  SOS_TRIGGERED: { bg: "#fecaca", fg: "#991b1b", label: "SOS déclenché" },
  RESOLVED: { bg: "#dcfce7", fg: "#166534", label: "Résolu" },
  ARCHIVED: { bg: "#e2e8f0", fg: "#475569", label: "Archivé" },
};

export function captureCurrentGeoloc(): Promise<IncidentGeoloc | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          altitudeM: pos.coords.altitude ?? null,
          capturedAt: new Date().toISOString(),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}
