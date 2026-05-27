/**
 * Documents Repository — types partagés (Tome 7).
 *
 * Module de gestion documentaire centralisée pour chaque dossier :
 *  contrats, plans, pièces écrites, permis, PV, factures, attestations…
 *
 * Workflow signature multi-parties séquentielle :
 *   DRAFT → PENDING_SIGNATURE → PARTIALLY_SIGNED → SIGNED
 *   ou DRAFT → SIGNED (signature unique)
 *   ou DRAFT → ARCHIVED (soft-delete)
 *
 * Chaque document possède un hash SHA-256 calculé à l'upload, immuable.
 * Quand toutes les signatures sont collectées, le hash final est ancré
 * dans la chaîne probatoire (`ProbativeLogService`).
 */

export const DOC_CATEGORIES = [
  "CONTRAT",
  "PLAN",
  "PIECE_ECRITE",
  "PERMIS",
  "PV",
  "FACTURE",
  "ATTESTATION",
  "CIN",
  "TITRE_FONCIER",
  "AUTRE",
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOC_STATUS = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "PARTIALLY_SIGNED",
  "SIGNED",
  "ARCHIVED",
] as const;

export type DocStatus = (typeof DOC_STATUS)[number];

/** Méthode de signature (placeholder Barid eSign + signature locale). */
export const SIG_METHODS = [
  "LOCAL_CANVAS", // signature manuscrite sur canvas → dataUrl PNG
  "BARID_ESIGN",  // future intégration Barid eSign (Maroc)
  "OTP_EMAIL",    // OTP envoyé par email
] as const;
export type SigMethod = (typeof SIG_METHODS)[number];

/** Une signature individuelle apposée sur un document. */
export type DocSignature = {
  id: string;
  signerId: string | null;       // userId si connu
  signerName: string;            // nom affiché du signataire
  signerRole: string;            // ARCHITECTE, MOD, CLIENT, OPS…
  signerEmail: string | null;
  dataUrl: string;               // PNG base64 (LOCAL_CANVAS)
  method: SigMethod;
  signedAt: string;              // ISO datetime
  ipAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
  order: number;                 // ordre dans le workflow séquentiel
};

/** Demande de signature envoyée à un signataire. */
export type SigRequest = {
  signerId: string | null;
  signerName: string;
  signerRole: string;
  signerEmail: string | null;
  order: number;
  status: "PENDING" | "SIGNED" | "DECLINED";
  requestedAt: string;
  notifiedAt: string | null;
};

/** Document complet stocké dans `Dossier.payload.documentsRepo[]`. */
export type Document = {
  id: string;
  dossierId: string;
  title: string;
  description: string | null;
  category: DocCategory;
  status: DocStatus;

  /** Fichier physique. */
  filename: string;              // nom original (UTF-8)
  storagePath: string;           // chemin relatif sous storage/documents/
  mimeType: string;
  sizeBytes: number;
  ext: string;

  /** Empreinte SHA-256 du contenu binaire (hex). */
  hashSha256: string;

  /** Workflow signature séquentielle. */
  signatureRequests: SigRequest[];
  signatures: DocSignature[];

  /** Métadonnées. */
  uploadedBy: string | null;
  uploadedAt: string;
  updatedAt: string;
  signedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;

  /** Hash probatoire écrit dans la chaîne lors de la finalisation. */
  probativeHash: string | null;
};

/** Vue allégée pour les listes. */
export type DocumentListItem = {
  id: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  signedAt: string | null;
  signaturesCount: number;
  pendingSignaturesCount: number;
};

/** Entrée d'upload (multipart). */
export type UploadDocumentInput = {
  title?: string;
  description?: string | null;
  category?: DocCategory;
};

/** Entrée d'une signature. */
export type SignDocumentInput = {
  dataUrl: string;
  signerRole: string;
  signerName?: string;
  signerEmail?: string | null;
  method?: SigMethod;
  geoLat?: number | null;
  geoLng?: number | null;
};

/** Demande de signature multi-parties. */
export type RequestSignatureInput = {
  signers: Array<{
    signerId?: string | null;
    signerName: string;
    signerRole: string;
    signerEmail?: string | null;
  }>;
};

/** Réponse de vérification publique (page QR). */
export type VerifyResult = {
  ok: boolean;
  docId: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  hashSha256: string;
  uploadedAt: string;
  signaturesCount: number;
  signers: Array<{ name: string; role: string; signedAt: string }>;
  probativeHash: string | null;
  message?: string;
};

/** Clé de stockage dans `Dossier.payload`. */
export const DOC_PAYLOAD_KEY = "documentsRepo";

/** Plafond upload : 25 MB. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Mime-types autorisés. */
export const ALLOWED_MIME_RX =
  /^(application\/pdf|image\/(jpeg|jpg|png|webp|heic)|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))|application\/vnd\.ms-excel|text\/(plain|csv))$/i;
