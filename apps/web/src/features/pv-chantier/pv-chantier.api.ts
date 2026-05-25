/**
 * apps/web/src/features/pv-chantier/pv-chantier.api.ts
 *
 * Client REST pour le module PV de Chantier (Tome 2).
 * Réutilise le helper apiFetch (JWT + erreurs).
 */

import { apiBase, apiFetch } from "../../tomes/tome4/apiClient";

export type PvTypeVisite =
  | "INITIALE"
  | "AVANCEMENT"
  | "RECEPTION_PROVISOIRE"
  | "RECEPTION_DEFINITIVE"
  | "LEVE_RESERVES";

export type PvSeverite = "INFO" | "AVIS" | "RESERVE" | "BLOQUANT";
export type PvStatus = "DRAFT" | "SIGNED_PARTIEL" | "FINAL";

export type PvGeoloc = {
  lat: number;
  lng: number;
  altitudeM?: number | null;
  accuracyM?: number | null;
  capturedAt?: string | null;
};

export type PvPresent = { nom: string; role: string; organisme?: string | null };
export type PvAbsent = { nom: string; role: string; motif?: string | null };

export type PvObservation = {
  id: string;
  lot?: string | null;
  severite: PvSeverite;
  titre: string;
  description?: string | null;
  photoUrls: string[];
  geoloc?: PvGeoloc | null;
  deadline?: string | null;
};

export type PvDecision = {
  id: string;
  description: string;
  responsable?: string | null;
  deadline?: string | null;
};

export type PvSignature = {
  partie: string;
  dataUrl: string;
  signedAt: string;
};

export type PvChantier = {
  id: string;
  dossierId: string;
  numero: string;
  date: string;
  typeVisite: PvTypeVisite;
  meteo?: string | null;
  temperatureC?: number | null;
  vent?: string | null;
  presents: PvPresent[];
  absents: PvAbsent[];
  observations: PvObservation[];
  decisions: PvDecision[];
  prochaineVisite?: string | null;
  signatures: PvSignature[];
  status: PvStatus;
  hashSha256?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};

export type PvChantierListItem = {
  id: string;
  numero: string;
  date: string;
  typeVisite: PvTypeVisite;
  status: PvStatus;
  createdAt: string;
  finalizedAt: string | null;
  observationsCount: number;
  severiteMax: PvSeverite | null;
};

export const pvChantierApi = {
  list(dossierId: string) {
    return apiFetch<{ items: PvChantierListItem[]; total: number }>(
      `/api/pv-chantier/dossier/${dossierId}`,
    );
  },
  get(pvId: string) {
    return apiFetch<PvChantier>(`/api/pv-chantier/${pvId}`);
  },
  create(dossierId: string, body: Partial<PvChantier>) {
    return apiFetch<PvChantier>(`/api/pv-chantier/dossier/${dossierId}`, {
      method: "POST",
      body,
    });
  },
  patch(pvId: string, body: Partial<PvChantier>) {
    return apiFetch<PvChantier>(`/api/pv-chantier/${pvId}`, {
      method: "PATCH",
      body,
    });
  },
  sign(pvId: string, partie: string, dataUrl: string) {
    return apiFetch<PvChantier>(`/api/pv-chantier/${pvId}/sign`, {
      method: "POST",
      body: { partie, dataUrl },
    });
  },
  finalize(pvId: string) {
    return apiFetch<PvChantier>(`/api/pv-chantier/${pvId}/finalize`, {
      method: "POST",
    });
  },
  uploadPhoto(
    pvId: string,
    file: { contentBase64: string; mimeType: string; filenameHint?: string },
  ) {
    return apiFetch<{ url: string }>(`/api/pv-chantier/${pvId}/photos`, {
      method: "POST",
      body: file,
    });
  },
  pdfUrl(pvId: string) {
    return `${apiBase()}/api/pv-chantier/${pvId}/pdf`;
  },
};

export const SEVERITE_COLOR: Record<PvSeverite, { bg: string; fg: string; label: string }> = {
  INFO: { bg: "#e0f2fe", fg: "#0369a1", label: "Info" },
  AVIS: { bg: "#fef9c3", fg: "#854d0e", label: "Avis" },
  RESERVE: { bg: "#fed7aa", fg: "#9a3412", label: "Réserve" },
  BLOQUANT: { bg: "#fecaca", fg: "#991b1b", label: "Bloquant" },
};

export const TYPE_VISITE_LABEL: Record<PvTypeVisite, string> = {
  INITIALE: "Visite initiale",
  AVANCEMENT: "Visite d'avancement",
  RECEPTION_PROVISOIRE: "Réception provisoire",
  RECEPTION_DEFINITIVE: "Réception définitive",
  LEVE_RESERVES: "Levée de réserves",
};

export const STATUS_COLOR: Record<PvStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: "#e2e8f0", fg: "#475569", label: "Brouillon" },
  SIGNED_PARTIEL: { bg: "#fef9c3", fg: "#854d0e", label: "Signature partielle" },
  FINAL: { bg: "#dcfce7", fg: "#166534", label: "Final" },
};
