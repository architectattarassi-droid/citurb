"use strict";
/**
 * Tome 2 — PV de Chantier (Procès-Verbaux)
 *
 * Types canoniques pour les PV de visite de chantier.
 *
 * Doctrine T2-R-PV-001 :
 *  - Tout PV finalisé est immuable (status=FINAL).
 *  - Un PV finalisé reçoit un hash SHA-256 et une entrée dans ProbativeLog.
 *  - La numérotation est de la forme `YYYY-NNN` (NNN remis à zéro chaque année).
 *  - Le PDF est généré à la demande à partir de l'HTML imprimable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PV_PAYLOAD_KEY = exports.PV_SEVERITE_ORDER = exports.PV_STATUS = exports.PV_SEVERITES = exports.PV_TYPES_VISITE = void 0;
exports.PV_TYPES_VISITE = [
    "INITIALE",
    "AVANCEMENT",
    "RECEPTION_PROVISOIRE",
    "RECEPTION_DEFINITIVE",
    "LEVE_RESERVES",
];
exports.PV_SEVERITES = ["INFO", "AVIS", "RESERVE", "BLOQUANT"];
exports.PV_STATUS = ["DRAFT", "SIGNED_PARTIEL", "FINAL"];
/**
 * Pour compter les sévérités max (max() ordonné) côté liste.
 */
exports.PV_SEVERITE_ORDER = {
    INFO: 0,
    AVIS: 1,
    RESERVE: 2,
    BLOQUANT: 3,
};
/**
 * Schéma Prisma proposé — voir INTEGRATION.md.
 * Tant que la migration n'est pas appliquée, le module persiste les PV
 * sous forme JSON dans `Dossier.payload.pvChantier` (fallback résilient).
 */
exports.PV_PAYLOAD_KEY = "pvChantier";
