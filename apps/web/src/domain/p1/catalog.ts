/**
 * Domaine P1 — Catalog
 * BLOC 2 (mémo): mapping unique des sections/champs à afficher selon type de projet.
 *
 * Objectif: éviter les incohérences (ex: RDC commercial affiché pour une villa).
 */

import type { PlanMode, ProjectType } from "./types";

export type CatalogKey =
  | "location"
  | "villa_subtype"
  | "immeuble_level"
  | "immeuble_commercial"
  | "surface_budget"
  | "timeline"
  | "owner_status";

export interface CatalogSection {
  key: CatalogKey;
  required?: boolean;
}

const COMMON: CatalogSection[] = [
  { key: "location", required: true },
  { key: "timeline", required: true },
];

const SURFACE_BUDGET_OWNER: CatalogSection[] = [
  { key: "surface_budget", required: true },
  { key: "owner_status", required: true },
];

export function getCatalog(projectType: ProjectType, _planMode: PlanMode): CatalogSection[] {
  // planMode utilisé plus tard (B5/B6) pour affiner certaines questions.

  if (projectType === "villa") {
    return [
      ...COMMON,
      { key: "villa_subtype", required: true },
      ...SURFACE_BUDGET_OWNER,
    ];
  }

  if (projectType === "immeuble") {
    return [
      ...COMMON,
      { key: "immeuble_level", required: true },
      { key: "immeuble_commercial", required: true },
      ...SURFACE_BUDGET_OWNER,
    ];
  }

  // renovation
  return [
    ...COMMON,
    // rénovation: surface/budget/owner peuvent être optionnels selon tunnel,
    // mais on laisse catalog commun (B5 décidera du gating exact).
    { key: "surface_budget" },
  ];
}
