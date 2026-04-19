import { CourType, EncType, FacadeCount, LotType, ProjectType } from "./universe.types";

/**
 * Rules ported from CITURBAREA_MOTEUR_V1_1 (engine prototype).
 * Goal: keep the same decision table, but without depending on Prisma tables yet.
 *
 * RDC ratio = maximum ground floor built surface ratio.
 * Floor ratio = maximum ratio for each upper floor.
 */
export function computeRdcRatio(projectType: ProjectType, lotType: LotType): number {
  if (projectType === "VILLA_ISOLEE") return 0.30;
  if (projectType === "VILLA_JUMELEE") return 0.35;
  // maison de ville
  return lotType === "ECO" ? 0.60 : 0.65;
}

export function computeUpperFloorRatio(projectType: ProjectType, lotType: LotType): number {
  if (projectType.startsWith("VILLA")) return 0.30;
  return lotType === "ECO" ? 0.55 : 0.60;
}

export function computeFacadeBonus(facades: FacadeCount): number {
  if (facades === 2) return 0.00;
  if (facades === 3) return 0.03;
  return 0.05; // 4 façades
}

export function computeCourPenalty(cour: CourType): number {
  switch (cour) {
    case "NONE": return 0.00;
    case "SMALL": return 0.02;
    case "MEDIUM": return 0.04;
    case "LARGE": return 0.07;
  }
}

export function computeEncorbellementBonus(enc: EncType): number {
  switch (enc) {
    case "NONE": return 0.00;
    case "LIGHT": return 0.02;
    case "HEAVY": return 0.04;
  }
}

/**
 * Built ratio is a heuristic "headroom" indicator: it is NOT an official urbanism rule,
 * just a consolidated score to rank configurations for the prototype.
 */
export function computeBuiltRatio(
  projectType: ProjectType,
  lotType: LotType,
  facades: FacadeCount,
  cour: CourType,
  enc: EncType
): number {
  const base = computeRdcRatio(projectType, lotType) + computeUpperFloorRatio(projectType, lotType);
  const bonus = computeFacadeBonus(facades) + computeEncorbellementBonus(enc);
  const penalty = computeCourPenalty(cour);
  return Math.max(0, Math.min(1, base + bonus - penalty));
}
