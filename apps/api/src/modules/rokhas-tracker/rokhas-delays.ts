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

import type { ProjectCategory } from "./types";

export const DELAI_DECISION_BY_CATEGORY: Record<ProjectCategory, number> = {
  1: 30,
  2: 60,
  3: 90,
};

export const DELAI_LEVEE_RESERVE_DAYS = 60;
export const DELAI_RELANCE_AJOURNE_DAYS = 30;

/** Ajoute N jours calendaires à une date ISO ; retourne ISO. */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`addDays: date invalide "${iso}"`);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Jours restants entre maintenant et deadline ISO. Négatif = dépassé. */
export function joursRestants(deadlineISO: string | null | undefined, now: Date = new Date()): number | null {
  if (!deadlineISO) return null;
  const d = new Date(deadlineISO);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

/** Calcule la deadline légale de décision pour une catégorie / date dépôt. */
export function computeDecisionDeadline(depositDateISO: string, category: ProjectCategory): string {
  const days = DELAI_DECISION_BY_CATEGORY[category];
  return addDays(depositDateISO, days);
}

/** Calcule la deadline de levée d'une réserve depuis la date de décision. */
export function computeReserveLeveeDeadline(decisionDateISO: string): string {
  return addDays(decisionDateISO, DELAI_LEVEE_RESERVE_DAYS);
}

/** Calcule la deadline de relance auto après ajournement. */
export function computeRelanceAjourneDeadline(ajourneDateISO: string): string {
  return addDays(ajourneDateISO, DELAI_RELANCE_AJOURNE_DAYS);
}

/**
 * Sévérité d'une deadline en fonction des jours restants.
 *  - OVERDUE  : déjà passée
 *  - CRITICAL : ≤ 7 jours
 *  - WARN     : ≤ 21 jours
 *  - OK       : > 21 jours
 */
export function severityFromJours(jours: number | null): "OK" | "WARN" | "CRITICAL" | "OVERDUE" {
  if (jours === null) return "OK";
  if (jours < 0) return "OVERDUE";
  if (jours <= 7) return "CRITICAL";
  if (jours <= 21) return "WARN";
  return "OK";
}
