/**
 * apps/web/src/features/permis-construire/permis-construire.api.ts
 *
 * Client REST pour le module Permis de Construire (Tome 2).
 * Réutilise apiFetch (JWT + erreurs centralisées).
 */

import { apiBase, apiFetch } from "../../tomes/tome4/apiClient";

export type ProjectType =
  | "VILLA"
  | "IMMEUBLE"
  | "LOTISSEMENT"
  | "HANGAR"
  | "EQUIPEMENT_PUBLIC"
  | "ERP"
  | "MOSQUEE"
  | "INDUSTRIEL";

export type StepId =
  | "identification"
  | "pieces"
  | "formulaires"
  | "review"
  | "soumission";

export type PieceStatus = "MISSING" | "UPLOADED" | "VALIDATED" | "REJECTED";
export type SubmissionMethod = "self" | "rokhas" | "mandated";

export interface PcIdentification {
  projectType: ProjectType | null;
  commune: string | null;
  prefecture?: string | null;
  surfaceTerrainM2?: number | null;
  surfacePlancherM2?: number | null;
  niveaux?: number | null;
  zoneSismique?: "I" | "II" | "III" | "IV" | "V" | null;
  architecteSlug?: string | null;
  architecteCnoa?: string | null;
  visaCroa?: string | null;
  notes?: string | null;
}

export interface PieceState {
  code: string;
  status: PieceStatus;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  filePath?: string;
  rejectReason?: string;
}

export interface PieceDefinition {
  code: string;
  label: string;
  labelAr: string;
  description: string;
  helpUrl?: string;
  helpText?: string;
  required: boolean;
  category:
    | "ADMINISTRATIF"
    | "FONCIER"
    | "GRAPHIQUE"
    | "TECHNIQUE"
    | "ATTESTATION"
    | "ANNEXE";
  acceptMime?: string[];
  maxSizeMb?: number;
}

export type EnrichedPiece = PieceDefinition & { state: PieceState };

export interface PcFormulaire {
  code:
    | "DEMANDE_AUTORISATION"
    | "ENGAGEMENT_ARCHITECTE"
    | "NOTICE_INCENDIE"
    | "NOTICE_PMR"
    | "NOTICE_THERMIQUE";
  label: string;
  generatedAt?: string;
  htmlPath?: string;
  data?: Record<string, unknown>;
}

export interface PcSoumission {
  method: SubmissionMethod;
  submittedAt?: string;
  reference?: string;
  rokhasReference?: string;
  attestationPath?: string;
  attestationHash?: string;
  attestationQrPayload?: string;
}

export interface PcDraft {
  schemaVersion: 1;
  dossierId: string;
  step: StepId;
  identification: PcIdentification;
  pieces: PieceState[];
  formulaires: PcFormulaire[];
  masterPdfPath?: string;
  masterCompiledAt?: string;
  masterHash?: string;
  soumission?: PcSoumission;
  createdAt: string;
  updatedAt: string;
}

export interface PcDraftResponse {
  draft: PcDraft;
  checklist: EnrichedPiece[];
  progress: {
    totalPieces: number;
    uploadedPieces: number;
    validatedPieces: number;
    requiredMissing: number;
    canCompile: boolean;
    canSubmit: boolean;
  };
}

const ROOT = "/api/permis-construire";

export function initPc(
  dossierId: string,
  input: {
    projectType: ProjectType;
    commune: string;
    prefecture?: string;
    surfaceTerrainM2?: number;
    surfacePlancherM2?: number;
    niveaux?: number;
    architecteSlug?: string;
    architecteCnoa?: string;
    visaCroa?: string;
  },
): Promise<PcDraftResponse> {
  return apiFetch(`${ROOT}/dossier/${encodeURIComponent(dossierId)}/init`, {
    method: "POST",
    body: input,
  });
}

export function getPc(dossierId: string): Promise<PcDraftResponse> {
  return apiFetch(`${ROOT}/dossier/${encodeURIComponent(dossierId)}`);
}

export function patchPcStep(
  dossierId: string,
  stepId: StepId,
  patch: {
    identification?: Partial<PcIdentification>;
    formulaireOverrides?: Record<string, Record<string, unknown>>;
    reviewNotes?: string;
  },
): Promise<PcDraftResponse> {
  return apiFetch(
    `${ROOT}/dossier/${encodeURIComponent(dossierId)}/step/${stepId}`,
    { method: "PATCH", body: patch },
  );
}

export function uploadPcPiece(
  dossierId: string,
  input: {
    pieceCode: string;
    fileName: string;
    mimeType: string;
    contentBase64: string;
  },
): Promise<PcDraftResponse> {
  return apiFetch(
    `${ROOT}/dossier/${encodeURIComponent(dossierId)}/upload-piece`,
    { method: "POST", body: input },
  );
}

export function generatePcFormulaires(
  dossierId: string,
): Promise<PcDraftResponse> {
  return apiFetch(
    `${ROOT}/dossier/${encodeURIComponent(dossierId)}/generate-formulaires`,
    { method: "POST" },
  );
}

export function compilePcMaster(dossierId: string): Promise<PcDraftResponse> {
  return apiFetch(
    `${ROOT}/dossier/${encodeURIComponent(dossierId)}/compile-master`,
    { method: "POST" },
  );
}

export function submitPc(
  dossierId: string,
  method: SubmissionMethod,
): Promise<PcDraftResponse> {
  return apiFetch(
    `${ROOT}/dossier/${encodeURIComponent(dossierId)}/submit`,
    { method: "POST", body: { method } },
  );
}

export function pcMasterUrl(dossierId: string): string {
  return `${apiBase()}${ROOT}/dossier/${encodeURIComponent(dossierId)}/master.pdf`;
}

export function pcFormulaireUrl(dossierId: string, code: string): string {
  return `${apiBase()}${ROOT}/dossier/${encodeURIComponent(dossierId)}/formulaire/${code}`;
}

export function pcAttestationUrl(dossierId: string): string {
  return `${apiBase()}${ROOT}/dossier/${encodeURIComponent(dossierId)}/attestation`;
}

/** Convertit un File en base64 pour upload. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result = "data:mime/type;base64,XXXX" → on garde après la virgule
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Catalogue projet → label FR. */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  VILLA: "Villa individuelle",
  IMMEUBLE: "Immeuble collectif",
  LOTISSEMENT: "Lotissement",
  HANGAR: "Hangar / entrepôt",
  EQUIPEMENT_PUBLIC: "Équipement public",
  ERP: "ERP (recevant du public)",
  MOSQUEE: "Mosquée",
  INDUSTRIEL: "Bâtiment industriel",
};

/** Catégorie pièce → label. */
export const PIECE_CATEGORY_LABELS: Record<PieceDefinition["category"], string> = {
  ADMINISTRATIF: "Administratif",
  FONCIER: "Foncier",
  GRAPHIQUE: "Plans graphiques",
  TECHNIQUE: "Notes techniques",
  ATTESTATION: "Attestations",
  ANNEXE: "Annexes",
};
