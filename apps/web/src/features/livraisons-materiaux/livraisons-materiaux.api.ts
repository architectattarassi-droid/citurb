/**
 * apps/web/src/features/livraisons-materiaux/livraisons-materiaux.api.ts
 *
 * Client REST pour le module Livraisons Matériaux (Tome 5).
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

export type CommandeStatus =
  | "REQUEST"
  | "CONFIRMED"
  | "EN_ROUTE"
  | "RECEIVED"
  | "CANCELLED"
  | "DISPUTED";

export type AnomalieType =
  | "QTY_MANQUANTE"
  | "QTY_EXCEDENT"
  | "QUALITE"
  | "CASSE"
  | "MATERIAU_NON_CONFORME"
  | "RETARD"
  | "AUTRE";

export type LigneCommande = {
  id: string;
  materialCode: string;
  materialLabel: string;
  unit: string;
  qtyDemandee: number;
  prixUnitaireMAD: number;
  totalLigne: number;
};

export type CommandeAnomalie = {
  id: string;
  ligneId: string;
  type: AnomalieType;
  description: string;
  photos: string[];
  declaredAt: string;
  resolved?: boolean;
};

export type Commande = {
  id: string;
  dossierId: string;
  supplierUserId: string;
  dateCreation: string;
  lignes: LigneCommande[];
  totalCommande: number;
  tva20: number;
  totalTtc: number;
  adresseLivraison: string;
  dateLivraisonSouhaitee: string;
  status: CommandeStatus;
  confirmedAt?: string;
  rejectedAt?: string;
  rejectionMotif?: string;
  enRouteAt?: string;
  deliveredAt?: string;
  receivedAt?: string;
  receptionPhotos: string[];
  signatureDataUrl?: string;
  qtyRecuesPart: Record<string, number>;
  anomalies: CommandeAnomalie[];
  paiementJalon?: { dueDate: string; paid: boolean };
  createdBy?: string;
  audit: Array<{
    at: string;
    action: string;
    actorId?: string;
    actorRole?: string;
    details?: Record<string, unknown>;
  }>;
};

export type CreateCommandeBody = {
  dossierId: string;
  supplierUserId: string;
  lignes: Array<{
    materialCode: string;
    materialLabel?: string;
    unit?: string;
    qty: number;
    prixUnitaire: number;
  }>;
  dateLivraisonSouhaitee: string;
  adresseLivraison: string;
};

export type ReceptionBody = {
  dossierId: string;
  photos: string[];
  qtyRecues: Record<string, number>;
  signatureDataUrl: string;
  anomalies?: Array<{
    ligneId: string;
    type: AnomalieType;
    description: string;
    photos?: string[];
  }>;
};

export type CalendarItem = {
  commandeId: string;
  supplierUserId: string;
  dateLivraisonSouhaitee: string;
  adresseLivraison: string;
  status: CommandeStatus;
  nbLignes: number;
  totalTtc: number;
};

export const livraisonsApi = {
  list(dossierId: string) {
    return apiFetch<{ items: Commande[]; total: number }>(
      `/api/livraisons/dossier/${dossierId}`,
    );
  },
  calendar(dossierId: string, week: string) {
    return apiFetch<{ week: string; items: CalendarItem[] }>(
      `/api/livraisons/dossier/${dossierId}/calendar?week=${encodeURIComponent(week)}`,
    );
  },
  get(dossierId: string, commandeId: string) {
    return apiFetch<Commande>(
      `/api/livraisons/commande/${commandeId}?dossierId=${encodeURIComponent(dossierId)}`,
    );
  },
  audit(dossierId: string, commandeId: string) {
    return apiFetch(`/api/livraisons/commande/${commandeId}/audit?dossierId=${encodeURIComponent(dossierId)}`);
  },
  create(body: CreateCommandeBody) {
    return apiFetch<Commande>(`/api/livraisons/commande`, { method: "POST", body });
  },
  confirmSupplier(commandeId: string, dossierId: string) {
    return apiFetch<Commande>(`/api/livraisons/commande/${commandeId}/confirm-supplier`, {
      method: "POST",
      body: { dossierId },
    });
  },
  rejectSupplier(commandeId: string, dossierId: string, motif: string) {
    return apiFetch<Commande>(`/api/livraisons/commande/${commandeId}/reject-supplier`, {
      method: "POST",
      body: { dossierId, motif },
    });
  },
  livraisonPrete(commandeId: string, dossierId: string) {
    return apiFetch<Commande>(`/api/livraisons/commande/${commandeId}/livraison-prete`, {
      method: "POST",
      body: { dossierId },
    });
  },
  reception(commandeId: string, body: ReceptionBody) {
    return apiFetch<Commande>(`/api/livraisons/commande/${commandeId}/reception`, {
      method: "POST",
      body,
    });
  },
  anomalie(
    commandeId: string,
    body: { dossierId: string; ligneId: string; type: AnomalieType; description: string; photos?: string[] },
  ) {
    return apiFetch<Commande>(`/api/livraisons/commande/${commandeId}/anomalie`, {
      method: "POST",
      body,
    });
  },
};

// ─── Helpers UI ──────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<CommandeStatus, { bg: string; fg: string; label: string }> = {
  REQUEST:   { bg: "#e0f2fe", fg: "#075985", label: "Demandée" },
  CONFIRMED: { bg: "#dcfce7", fg: "#166534", label: "Confirmée" },
  EN_ROUTE:  { bg: "#fef9c3", fg: "#854d0e", label: "En route" },
  RECEIVED:  { bg: "#e0e7ff", fg: "#3730a3", label: "Reçue" },
  CANCELLED: { bg: "#f1f5f9", fg: "#475569", label: "Annulée" },
  DISPUTED:  { bg: "#fee2e2", fg: "#991b1b", label: "Litige" },
};

export const ANOMALIE_LABEL: Record<AnomalieType, string> = {
  QTY_MANQUANTE: "Quantité manquante",
  QTY_EXCEDENT: "Quantité excédentaire",
  QUALITE: "Problème qualité",
  CASSE: "Casse / endommagement",
  MATERIAU_NON_CONFORME: "Matériau non conforme",
  RETARD: "Retard livraison",
  AUTRE: "Autre",
};

export function fmtMad(n: number, withSuffix = true): string {
  const f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return withSuffix ? `${f} MAD` : f;
}

/** ISO-8601 week key (YYYY-WW). Identique au calcul backend. */
export function isoWeekKey(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+target - +yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

export function currentIsoWeek(): string {
  return isoWeekKey(new Date());
}
