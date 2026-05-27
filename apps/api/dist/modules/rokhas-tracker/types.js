"use strict";
/**
 * Rokhas Tracker — Types
 *
 * Suivi visuel temps réel de l'instruction d'un permis de construire
 * dans le circuit Rokhas (rokhas.ma / commune).
 *
 * Distinction avec `pv-commission-rokhas` :
 *  - `pv-commission-rokhas` : parsing d'un PV (compte-rendu officiel)
 *    une fois la commission tenue, avec extraction de réserves.
 *  - `rokhas-tracker` (ici)  : tracker de jalons d'instruction depuis le
 *    dépôt jusqu'à la délivrance, calcul des deadlines légales (décret
 *    2-13-424), countdown client, vue timeline.
 *
 * Le tracker peut consommer un PV existant pour matérialiser
 * l'événement `DECISION` (cf. service.acceptPvDecision).
 */
Object.defineProperty(exports, "__esModule", { value: true });
