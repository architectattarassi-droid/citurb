"use strict";
/**
 * lead-funnel.types.ts
 *
 * Types et contrats du module LEAD FUNNEL (Tome 0 — capture & qualification).
 *
 * Stratégie de persistence (MVP) :
 *  - Pas de migration Prisma immédiate (cf. INTEGRATION.md pour le modèle
 *    Lead à ajouter ultérieurement).
 *  - Fallback : Map en mémoire + dump JSON best-effort dans `data/leads.json`
 *    (idempotent, survit aux redémarrages dev). Production : remplacer par
 *    Prisma dès que le modèle est appliqué.
 */
Object.defineProperty(exports, "__esModule", { value: true });
