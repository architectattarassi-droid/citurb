"use strict";
/**
 * Rokhas — Calcul des deadlines légales
 *
 * Source : décret 2-13-424 (instruction des permis de construire au Maroc)
 * et doctrine DGCL — silence de l'administration = refus implicite.
 *
 * Délais légaux DÉCISION après dépôt :
 *  - Catégorie 1 : constructions courantes (R+0, R+1 résidentiel simple)
 *      → 30 jours calendaires
 *  - Catégorie 2 : équipements publics, ERP, R+5 et plus
 *      → 60 jours calendaires
 *  - Catégorie 3 : grands projets, dérogations PA, projets stratégiques
 *      → 90 jours calendaires
 *
 * Délai LEVÉE DE RÉSERVES (post-commission) : 60 jours calendaires.
 *
 * Délai RELANCE AJOURNÉ : 30 jours après notif d'ajournement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELAI_RELANCE_AJOURNE_DAYS = exports.DELAI_LEVEE_RESERVE_DAYS = exports.DELAI_DECISION_BY_CATEGORY = void 0;
exports.addDays = addDays;
exports.joursRestants = joursRestants;
exports.computeDecisionDeadline = computeDecisionDeadline;
exports.computeReserveLeveeDeadline = computeReserveLeveeDeadline;
exports.computeRelanceAjourneDeadline = computeRelanceAjourneDeadline;
exports.severityFromJours = severityFromJours;
exports.DELAI_DECISION_BY_CATEGORY = {
    1: 30,
    2: 60,
    3: 90,
};
exports.DELAI_LEVEE_RESERVE_DAYS = 60;
exports.DELAI_RELANCE_AJOURNE_DAYS = 30;
/** Ajoute N jours calendaires à une date ISO ; retourne ISO. */
function addDays(iso, days) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        throw new Error(`addDays: date invalide "${iso}"`);
    d.setDate(d.getDate() + days);
    return d.toISOString();
}
/** Jours restants entre maintenant et deadline ISO. Négatif = dépassé. */
function joursRestants(deadlineISO, now = new Date()) {
    if (!deadlineISO)
        return null;
    const d = new Date(deadlineISO);
    if (Number.isNaN(d.getTime()))
        return null;
    const diffMs = d.getTime() - now.getTime();
    return Math.ceil(diffMs / 86400000);
}
/** Calcule la deadline légale de décision pour une catégorie / date dépôt. */
function computeDecisionDeadline(depositDateISO, category) {
    const days = exports.DELAI_DECISION_BY_CATEGORY[category];
    return addDays(depositDateISO, days);
}
/** Calcule la deadline de levée d'une réserve depuis la date de décision. */
function computeReserveLeveeDeadline(decisionDateISO) {
    return addDays(decisionDateISO, exports.DELAI_LEVEE_RESERVE_DAYS);
}
/** Calcule la deadline de relance auto après ajournement. */
function computeRelanceAjourneDeadline(ajourneDateISO) {
    return addDays(ajourneDateISO, exports.DELAI_RELANCE_AJOURNE_DAYS);
}
/**
 * Sévérité d'une deadline en fonction des jours restants.
 *  - OVERDUE  : déjà passée
 *  - CRITICAL : ≤ 7 jours
 *  - WARN     : ≤ 21 jours
 *  - OK       : > 21 jours
 */
function severityFromJours(jours) {
    if (jours === null)
        return "OK";
    if (jours < 0)
        return "OVERDUE";
    if (jours <= 7)
        return "CRITICAL";
    if (jours <= 21)
        return "WARN";
    return "OK";
}
