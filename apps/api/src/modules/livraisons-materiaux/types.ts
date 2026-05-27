/**
 * apps/api/src/modules/livraisons-materiaux/types.ts
 *
 * Types canoniques pour le module Livraisons Matériaux (Tome 5).
 *
 * Stockage MVP : JSON dans `Dossier.payload.livraisons` (array de Commande).
 * Aucun modèle Prisma nouveau — extension future possible via tables dédiées.
 */

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

export type CommandePaiementJalon = {
  dueDate: string;
  paid: boolean;
};

export type Commande = {
  id: string;
  dossierId: string;
  supplierUserId: string;
  dateCreation: string;
  lignes: LigneCommande[];
  totalCommande: number; // HT
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
  paiementJalon?: CommandePaiementJalon;
  createdBy?: string;
  // Trail simplifié des actions (rule, actor, ts)
  audit: Array<{
    at: string;
    action: string;
    actorId?: string;
    actorRole?: string;
    details?: Record<string, unknown>;
  }>;
};

export type CreateCommandeInput = {
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

export type ReceptionInput = {
  photos: string[];
  qtyRecues: Record<string, number>; // ligneId → qtyRecue
  signatureDataUrl: string;
  anomalies?: Array<{
    ligneId: string;
    type: AnomalieType;
    description: string;
    photos?: string[];
  }>;
};

export type AnomalieInput = {
  ligneId: string;
  type: AnomalieType;
  description: string;
  photos?: string[];
};

/**
 * Computed week key: ISO-8601 "YYYY-WW" (week of year).
 * Example: 2026 week 21 → "2026-21"
 */
export function isoWeekKey(d: Date): string {
  // ISO week algorithm (ISO 8601).
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+target - +yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}
