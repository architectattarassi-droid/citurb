/**
 * Tome 2 — Permis de Construire (PC)
 * Types partagés API ↔ Web pour le wizard PC.
 *
 * Doctrine :
 *  - Brouillon stocké dans `Dossier.payload.permisConstruire` (clé bag JSON)
 *    tant que les tables Prisma dédiées ne sont pas migrées.
 *  - PieceStatus / StepId / ProjectType normalisés (jamais de strings libres
 *    côté contrôleur).
 */

export const PC_PAYLOAD_KEY = "permisConstruire";

/** Types de projet supportés par le wizard (couvre 95 % des PC marocains). */
export const PROJECT_TYPES = [
  "VILLA",
  "IMMEUBLE",
  "LOTISSEMENT",
  "HANGAR",
  "EQUIPEMENT_PUBLIC",
  "ERP",
  "MOSQUEE",
  "INDUSTRIEL",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Étapes du wizard (5 étapes, ordre figé). */
export const STEP_IDS = [
  "identification",
  "pieces",
  "formulaires",
  "review",
  "soumission",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** Statut d'une pièce du dossier. */
export const PIECE_STATUSES = ["MISSING", "UPLOADED", "VALIDATED", "REJECTED"] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

/** Méthode de soumission finale. */
export const SUBMISSION_METHODS = ["self", "rokhas", "mandated"] as const;
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number];

/** Identifiant projet — saisi étape 1. */
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

/** Définition d'une pièce requise issue du référentiel `pieces-requises.json`. */
export interface PieceDefinition {
  code: string;
  label: string;
  labelAr: string;
  description: string;
  /** Aide "Comment obtenir ?" (URL ou texte court). */
  helpUrl?: string;
  helpText?: string;
  /** Pièce obligatoire (true) ou facultative (false). */
  required: boolean;
  /** Catégorie pour le regroupement UI. */
  category:
    | "ADMINISTRATIF"
    | "FONCIER"
    | "GRAPHIQUE"
    | "TECHNIQUE"
    | "ATTESTATION"
    | "ANNEXE";
  /** MIME types acceptés (info UI). */
  acceptMime?: string[];
  /** Taille max conseillée (MB). */
  maxSizeMb?: number;
}

/** État d'une pièce dans le brouillon PC. */
export interface PieceState {
  code: string;
  status: PieceStatus;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  /** Chemin relatif sous le storage PC (jamais exposé brut). */
  filePath?: string;
  rejectReason?: string;
}

/** Formulaire officiel généré (étape 3). */
export interface PcFormulaire {
  code: "DEMANDE_AUTORISATION" | "ENGAGEMENT_ARCHITECTE" | "NOTICE_INCENDIE" | "NOTICE_PMR" | "NOTICE_THERMIQUE";
  label: string;
  generatedAt?: string;
  /** Snapshot HTML imprimable (sauvegardé sous storage). */
  htmlPath?: string;
  /** Données dont l'utilisateur a accepté la pré-saisie. */
  data?: Record<string, unknown>;
}

/** Soumission finale (étape 5). */
export interface PcSoumission {
  method: SubmissionMethod;
  submittedAt?: string;
  reference?: string;
  rokhasReference?: string;
  attestationPath?: string;
  attestationHash?: string;
  attestationQrPayload?: string;
}

/** État complet du brouillon PC stocké dans `Dossier.payload.permisConstruire`. */
export interface PcDraft {
  /** Version du schéma (pour migrations futures). */
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

/** Réponse complète envoyée au front (brouillon + checklist enrichie). */
export interface PcDraftResponse {
  draft: PcDraft;
  /** Pièces requises pour le couple (projectType + commune) avec leur statut. */
  checklist: Array<PieceDefinition & { state: PieceState }>;
  /** Indicateurs de progression. */
  progress: {
    totalPieces: number;
    uploadedPieces: number;
    validatedPieces: number;
    requiredMissing: number;
    canCompile: boolean;
    canSubmit: boolean;
  };
}

/** Payload init brouillon. */
export interface PcInitInput {
  projectType: ProjectType;
  commune: string;
  prefecture?: string;
  surfaceTerrainM2?: number;
  surfacePlancherM2?: number;
  niveaux?: number;
  architecteSlug?: string;
  architecteCnoa?: string;
  visaCroa?: string;
}

/** Payload update step. */
export interface PcStepPatch {
  identification?: Partial<PcIdentification>;
  /** Pour étape formulaire : data validée par l'utilisateur. */
  formulaireOverrides?: Record<string, Record<string, unknown>>;
  /** Notes libres (review). */
  reviewNotes?: string;
}

/** Payload upload pièce. */
export interface PcUploadPieceInput {
  pieceCode: string;
  fileName: string;
  mimeType: string;
  /** Contenu base64 (≤ 25 MB recommandé). */
  contentBase64: string;
}
