/**
 * Domaine P1 — Validation
 * BLOC 2 (mémo): validations minimales + règles villa façades verrouillées.
 */

import type { P1ProjectData, VillaSubtype } from "./types";

export function facadesForVillaSubtype(sub: VillaSubtype): 2 | 3 | 4 {
  if (sub === "bande") return 2;
  if (sub === "jumelee") return 3;
  return 4;
}

export function validateP1ProjectData(data: Partial<P1ProjectData>): string[] {
  const errors: string[] = [];

  if (!data.projectType) errors.push("projectType requis");
  if (!data.planMode) errors.push("planMode requis");

  // Localisation
  if (!data.region) errors.push("region requise");
  if (!data.province) errors.push("province requise");
  if (!data.commune) errors.push("commune requise");

  if (data.projectType === "villa") {
    if (!data.villaSubtype) {
      errors.push("villaSubtype requis");
    } else {
      const expected = facadesForVillaSubtype(data.villaSubtype);
      if (data.facades && data.facades !== expected) {
        errors.push(`Villa ${data.villaSubtype} = ${expected} façades`);
      }
    }
  }

  if (data.projectType === "immeuble") {
    if (!data.rLevel) errors.push("rLevel requis");
    if (data.commercialGroundFloor === undefined) errors.push("commercialGroundFloor requis");
  }

  // Surface/budget: requis sauf cas rénovation (tunnel peut l’assouplir plus tard)
  if (data.projectType !== "renovation") {
    if (data.surface === undefined || Number.isNaN(Number(data.surface))) errors.push("surface requise");
    if (data.budget === undefined || Number.isNaN(Number(data.budget))) errors.push("budget requis");
  }

  if (!data.horizon) errors.push("horizon requis");

  return errors;
}
