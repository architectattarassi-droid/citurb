"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_MIME_RX = exports.MAX_UPLOAD_BYTES = exports.DOC_PAYLOAD_KEY = exports.SIG_METHODS = exports.DOC_STATUS = exports.DOC_CATEGORIES = void 0;
exports.DOC_CATEGORIES = [
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
];
exports.DOC_STATUS = [
    "DRAFT",
    "PENDING_SIGNATURE",
    "PARTIALLY_SIGNED",
    "SIGNED",
    "ARCHIVED",
];
/** Méthode de signature (placeholder Barid eSign + signature locale). */
exports.SIG_METHODS = [
    "LOCAL_CANVAS", // signature manuscrite sur canvas → dataUrl PNG
    "BARID_ESIGN", // future intégration Barid eSign (Maroc)
    "OTP_EMAIL", // OTP envoyé par email
];
/** Clé de stockage dans `Dossier.payload`. */
exports.DOC_PAYLOAD_KEY = "documentsRepo";
/** Plafond upload : 25 MB. */
exports.MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Mime-types autorisés. */
exports.ALLOWED_MIME_RX = /^(application\/pdf|image\/(jpeg|jpg|png|webp|heic)|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))|application\/vnd\.ms-excel|text\/(plain|csv))$/i;
