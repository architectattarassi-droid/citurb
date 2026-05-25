"use strict";
/**
 * dossier-interactions.types.ts
 *
 * Types canoniques du fil d'interactions Dossier (Tome 6).
 *
 * Modèle conçu pour matcher 1:1 la proposition Prisma `DossierInteraction`
 * (voir INTEGRATION.md). En attendant la migration Prisma, la persistence est
 * faite dans `Dossier.payload.interactions[]` (compat sans casser la prod).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDIT_WINDOW_MS = exports.FAST_EMOJIS = void 0;
/** Allow-list emojis rapides (UX commande) — refusés sinon. */
exports.FAST_EMOJIS = ["👍", "❤️", "🎉", "🤔", "⚠️"];
/** Durée d'édition autorisée pour l'auteur après création. */
exports.EDIT_WINDOW_MS = 15 * 60 * 1000;
