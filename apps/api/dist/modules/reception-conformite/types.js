"use strict";
/**
 * Tome 3 — Module Réception + Certificat de Conformité + Permis d'Habiter
 *
 * Concepts juridiques Maroc :
 *  - Réception provisoire : MOA prend possession ouvrage (art. 769 DOC).
 *    Point de départ des garanties légales.
 *  - Levée de réserves : chaque réserve formulée à la réception provisoire
 *    doit être levée (description + preuves photos + signature).
 *  - Réception définitive : 1 an après la provisoire si toutes réserves
 *    sont levées. Libère la retenue de garantie.
 *  - Permis d'Habiter / Certificat de Conformité : délivré par la commune
 *    après visite de conformité (loi 66-12 + décret 2-14-394). La plateforme
 *    suit la procédure et conserve une attestation probante CITURBAREA.
 *  - Garantie parfait achèvement : 1 an (art. 769 DOC)
 *  - Garantie biennale : 2 ans éléments dissociables (art. 769 bis DOC)
 *  - Garantie décennale : 10 ans solidité ouvrage + clos/couvert (art. 769 DOC)
 *
 * Persistance MVP : `Dossier.payload.receptionConformite` (JSON).
 * Migration cible : voir INTEGRATION.md (modèles Prisma).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GARANTIE_DUREE_JOURS = exports.SINISTRE_STATUS = exports.GARANTIE_TYPES = exports.PERMIS_HABITER_STATUS = exports.RECEPTION_STATUS = exports.RECEPTION_PAYLOAD_KEY = void 0;
exports.RECEPTION_PAYLOAD_KEY = "receptionConformite";
exports.RECEPTION_STATUS = [
    "NONE",
    "PROVISOIRE_DRAFT",
    "PROVISOIRE_SIGNED",
    "RESERVES_EN_COURS",
    "RESERVES_LEVEES",
    "DEFINITIVE_SIGNED",
];
exports.PERMIS_HABITER_STATUS = [
    "NON_DEMANDE",
    "DEMANDE_DEPOSEE",
    "VISITE_PLANIFIEE",
    "VISITE_EFFECTUEE",
    "DELIVRE",
    "REFUSE",
];
exports.GARANTIE_TYPES = [
    "PARFAIT_ACHEVEMENT",
    "BIENNALE",
    "DECENNALE",
];
exports.SINISTRE_STATUS = [
    "DECLARE",
    "EN_INSTRUCTION",
    "ACCEPTE",
    "REJETE",
    "CLOS",
];
// Durées légales (jours) — Maroc DOC art. 769 / 769 bis
exports.GARANTIE_DUREE_JOURS = {
    PARFAIT_ACHEVEMENT: 365,
    BIENNALE: 365 * 2,
    DECENNALE: 365 * 10,
};
