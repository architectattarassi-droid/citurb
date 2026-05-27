"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBMISSION_METHODS = exports.PIECE_STATUSES = exports.STEP_IDS = exports.PROJECT_TYPES = exports.PC_PAYLOAD_KEY = void 0;
exports.PC_PAYLOAD_KEY = "permisConstruire";
/** Types de projet supportés par le wizard (couvre 95 % des PC marocains). */
exports.PROJECT_TYPES = [
    "VILLA",
    "IMMEUBLE",
    "LOTISSEMENT",
    "HANGAR",
    "EQUIPEMENT_PUBLIC",
    "ERP",
    "MOSQUEE",
    "INDUSTRIEL",
];
/** Étapes du wizard (5 étapes, ordre figé). */
exports.STEP_IDS = [
    "identification",
    "pieces",
    "formulaires",
    "review",
    "soumission",
];
/** Statut d'une pièce du dossier. */
exports.PIECE_STATUSES = ["MISSING", "UPLOADED", "VALIDATED", "REJECTED"];
/** Méthode de soumission finale. */
exports.SUBMISSION_METHODS = ["self", "rokhas", "mandated"];
