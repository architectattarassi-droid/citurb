"use strict";
/**
 * apps/api/src/modules/livraisons-materiaux/types.ts
 *
 * Types canoniques pour le module Livraisons Matériaux (Tome 5).
 *
 * Stockage MVP : JSON dans `Dossier.payload.livraisons` (array de Commande).
 * Aucun modèle Prisma nouveau — extension future possible via tables dédiées.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoWeekKey = isoWeekKey;
/**
 * Computed week key: ISO-8601 "YYYY-WW" (week of year).
 * Example: 2026 week 21 → "2026-21"
 */
function isoWeekKey(d) {
    // ISO week algorithm (ISO 8601).
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((+target - +yearStart) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}
