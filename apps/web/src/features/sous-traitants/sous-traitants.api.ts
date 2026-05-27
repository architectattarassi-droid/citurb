/**
 * Sous-Traitants — client API (Tome 3 / P3 MOD délégué).
 *
 * Hôte module : /api/sous-traitants (cf. INTEGRATION.md API).
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

export type SousTraitantStatus =
  | "PROPOSED"
  | "CONTRACTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "TERMINATED";

export type LotCatalogEntry = {
  code: string;
  intitule: string;
  numero: number;
  agrementRequis?: boolean;
};

export type Conditions = {
  delaiJours: number;
  garantie?: string;
  penaliteJours?: number;
  retenueGarantie?: number;
};

export type SituationPhoto = {
  url: string;
  geoloc?: { lat: number; lng: number; accuracyM?: number };
  capturedAt?: string;
  caption?: string;
};

export type SituationTravaux = {
  id: string;
  declaredAt: string;
  declaredBy: string;
  pctAvancement: number;
  pctIncrement: number;
  montantPaiement: number;
  photos: SituationPhoto[];
  commentaire?: string;
  validatedAt?: string;
  validatedBy?: string;
  rejetMotif?: string;
  paidAt?: string;
  paymentRef?: string;
};

export type Evaluation = {
  qualite: number;
  delai: number;
  communication: number;
  relation: number;
  scoreMoyen: number;
  commentaire?: string;
  evaluatedAt: string;
  evaluatedBy: string;
};

export type SousTraitantAssignment = {
  id: string;
  dossierId: string;
  lotCode: string;
  lotIntitule: string;
  lotNumero: number;
  supplierUserId?: string | null;
  supplierCabinet: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierClasse?: string | null;
  supplierAgrements: string[];
  montantHt: number;
  tva: number;
  montantTtc: number;
  devise: "MAD";
  conditions: Conditions;
  contratPdfUrl?: string | null;
  contratHash?: string | null;
  contratSignedAt?: string | null;
  contratSignedBy?: string | null;
  situations: SituationTravaux[];
  evaluation?: Evaluation;
  status: SousTraitantStatus;
  loi32_99_declared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssignInput = {
  lotCode: string;
  supplierUserId?: string | null;
  supplierCabinet: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierClasse?: string | null;
  supplierAgrements?: string[];
  montantHt: number;
  tva?: number;
  conditions: Conditions;
  loi32_99_declared?: boolean;
};

export type SituationDeclareInput = {
  pctAvancement: number;
  photos: SituationPhoto[];
  commentaire?: string;
};

export type EvaluationInput = {
  qualite: number;
  delai: number;
  communication: number;
  relation: number;
  commentaire?: string;
};

export type Loi32_99Audit = {
  dossierId: string;
  totalAssignments: number;
  declared: number;
  undeclared: number;
  missingAgrement: number;
  anomalies: Array<{
    assignmentId: string;
    lotCode: string;
    supplierCabinet: string;
    severity: "INFO" | "WARN" | "CRITICAL";
    code: string;
    message: string;
  }>;
  conformite: "CONFORME" | "ANOMALIES" | "NON_CONFORME";
  auditedAt: string;
};

export const STATUS_COLOR: Record<SousTraitantStatus, { bg: string; fg: string; label: string }> = {
  PROPOSED: { bg: "#e2e8f0", fg: "#475569", label: "Proposé" },
  CONTRACTED: { bg: "#dbeafe", fg: "#1e40af", label: "Contracté" },
  IN_PROGRESS: { bg: "#fef9c3", fg: "#854d0e", label: "En cours" },
  COMPLETED: { bg: "#dcfce7", fg: "#166534", label: "Terminé" },
  TERMINATED: { bg: "#fecaca", fg: "#991b1b", label: "Résilié" },
};

export const sousTraitantsApi = {
  catalogLots() {
    return apiFetch<{ ok: true; count: number; lots: LotCatalogEntry[] }>(
      "/api/sous-traitants/catalog/lots",
    );
  },
  list(dossierId: string) {
    return apiFetch<{ ok: true; count: number; items: SousTraitantAssignment[] }>(
      `/api/sous-traitants/dossier/${dossierId}`,
    );
  },
  get(assignmentId: string) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment }>(
      `/api/sous-traitants/${assignmentId}`,
    );
  },
  assign(dossierId: string, body: AssignInput) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment }>(
      `/api/sous-traitants/dossier/${dossierId}/assign`,
      { method: "POST", body },
    );
  },
  generateContrat(assignmentId: string) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment; html: string }>(
      `/api/sous-traitants/${assignmentId}/contrat`,
      { method: "POST" },
    );
  },
  signContrat(assignmentId: string, dataUrl: string) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment }>(
      `/api/sous-traitants/${assignmentId}/contrat/sign`,
      { method: "POST", body: { dataUrl } },
    );
  },
  declareSituation(assignmentId: string, body: SituationDeclareInput) {
    return apiFetch<{ ok: true; situation: SituationTravaux }>(
      `/api/sous-traitants/${assignmentId}/situation`,
      { method: "POST", body },
    );
  },
  validateSituation(assignmentId: string, sitId: string) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment; situation: SituationTravaux }>(
      `/api/sous-traitants/${assignmentId}/situation/${sitId}/valider`,
      { method: "POST" },
    );
  },
  rejectSituation(assignmentId: string, sitId: string, motif: string) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment }>(
      `/api/sous-traitants/${assignmentId}/situation/${sitId}/rejeter`,
      { method: "POST", body: { motif } },
    );
  },
  evaluate(assignmentId: string, body: EvaluationInput) {
    return apiFetch<{ ok: true; assignment: SousTraitantAssignment }>(
      `/api/sous-traitants/${assignmentId}/evaluation`,
      { method: "POST", body },
    );
  },
  historique(assignmentId: string) {
    return apiFetch<{
      ok: true;
      assignment: SousTraitantAssignment;
      timeline: Array<{ at: string; type: string; payload: any }>;
    }>(`/api/sous-traitants/${assignmentId}/historique`);
  },
  audit(dossierId: string) {
    return apiFetch<{ ok: true; audit: Loi32_99Audit }>(
      `/api/sous-traitants/dossier/${dossierId}/audit-loi-32-99`,
    );
  },
};

/** Helper format MAD. */
export function fmtMad(n: number): string {
  try {
    return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(n);
  } catch {
    return `${n.toFixed(2)} MAD`;
  }
}
