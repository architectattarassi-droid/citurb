/**
 * dossier-shape.ts — Mapping Dossier (Prisma) → DossierShape (catalogue v7).
 *
 * Vague 1 migration phase-engine → catalogue v7. Pur, sans I/O.
 *
 * NOTE : tant que packages/contracts/src/phases.catalog.ts n'est pas déposé,
 * le type DossierShape est défini localement ici (forme minimale). À la livraison
 * du catalogue, remplacer l'import local par :
 *   import type { DossierShape } from "@citurbarea/contracts";
 *   import { validateDossier } from "@citurbarea/contracts";
 * et supprimer les types/validation locaux marqués "TODO v7-catalog".
 */

// TODO v7-catalog : remplacer par import { DossierShape } from "@citurbarea/contracts"
export interface DossierShape {
  porte: string; // "P1" .. "P6"
  nbEtagesHorsSol: number;
  nbSousSols: number;
  typeOperationFoncier: string; // "aucun" | "lotissement" | "morcellement" | "echange" | ...
  flags: Record<string, boolean>;
  lotsApplicables?: string[]; // undefined = tous applicables
}

export interface DossierShapeValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Règle de dérivation nbEtagesHorsSol depuis l'existant nbNiveaux :
 *
 *  - Si le champ `nbEtagesHorsSol` est posé explicitement → on l'utilise tel quel.
 *  - Sinon, on retombe sur `nbNiveaux` (sémantique historique : total niveaux
 *    hors-sol selon la pratique CITURBAREA antérieure). Sécurité : on retire
 *    `nbSousSols` au cas où l'utilisateur aurait additionné, ce qui donne au
 *    pire un résultat plus PETIT (jamais surévalué).
 *  - Si aucun n'est posé → 0 (défaut sûr : aucune phase d'étage générée).
 *
 *  Cette dérivation est conservatoire (jamais d'invention de phases). Le champ
 *  `nbEtagesHorsSol` explicite est toujours prioritaire dès qu'il est saisi.
 */
function deriveEtagesHorsSol(
  nbEtagesHorsSol: number | null | undefined,
  nbNiveaux: number | null | undefined,
  nbSousSols: number,
): number {
  if (typeof nbEtagesHorsSol === "number" && nbEtagesHorsSol >= 0) {
    return nbEtagesHorsSol;
  }
  if (typeof nbNiveaux === "number" && nbNiveaux >= 0) {
    return Math.max(0, nbNiveaux - nbSousSols);
  }
  return 0;
}

/**
 * Mappe un Dossier Prisma vers un DossierShape consommable par le catalogue v7.
 *
 * Pur, idempotent. Le caller passe le dossier déjà chargé (PrismaService).
 * Les flags sont lus depuis `payload.phaseFlags` s'il existe (Json), sinon {}.
 * lotsApplicables est laissé undefined en vague 1 (tous les lots actifs).
 */
export function dossierToShape(dossier: {
  porteType?: string | null;
  nbEtagesHorsSol?: number | null;
  nbSousSols?: number | null;
  nbNiveaux?: number | null;
  typeOperationFoncier?: string | null;
  payload?: unknown;
}): DossierShape {
  const porte = dossier.porteType ?? "P1";
  const nbSousSols = dossier.nbSousSols ?? 0;
  const nbEtagesHorsSol = deriveEtagesHorsSol(
    dossier.nbEtagesHorsSol,
    dossier.nbNiveaux,
    nbSousSols,
  );
  const typeOperationFoncier = dossier.typeOperationFoncier ?? "aucun";

  // Les 7 flags v7 (vague A) doivent toujours être présents et booléens
  // (validateDossier l'exige). On initialise à false par défaut puis on écrase
  // depuis payload si présent. Tout flag inconnu est ignoré.
  const flags: Record<string, boolean> = {
    securiteIncendie: false,
    ascenseur: false,
    financementBancaire: false,
    raccordementsDefinitifs: false,
    // Vague A — 3 nouveaux flags ajoutés au catalogue v7
    terrainNonBorne: false,
    chantierComplexe: false,
    demolitionExistant: false,
  };
  const payload = dossier.payload as Record<string, unknown> | null | undefined;
  if (payload && typeof payload === "object") {
    const pf = (payload as { phaseFlags?: unknown }).phaseFlags;
    if (pf && typeof pf === "object" && !Array.isArray(pf)) {
      for (const [k, v] of Object.entries(pf)) {
        if (typeof v === "boolean" && k in flags) flags[k] = v;
      }
    }
  }

  return {
    porte,
    nbEtagesHorsSol,
    nbSousSols,
    typeOperationFoncier,
    flags,
    lotsApplicables: undefined,
  };
}

/**
 * Validation minimale locale (vague 1).
 *
 * TODO v7-catalog : remplacer par validateDossier(shape) du catalogue, qui
 * connaît la liste exacte des portes/flags/lots autorisés.
 *
 * À utiliser en mode log-only en vague 1 : si !ok, l'appelant loggue et
 * continue (jamais throw) pour repérer les dossiers existants non conformes
 * sans casser le boot ni un endpoint live.
 */
export function validateDossierShape(shape: DossierShape): DossierShapeValidation {
  const errors: string[] = [];
  if (!/^P[1-6]$/.test(shape.porte)) {
    errors.push(`porte invalide : "${shape.porte}" (attendu P1..P6)`);
  }
  if (!Number.isInteger(shape.nbEtagesHorsSol) || shape.nbEtagesHorsSol < 0) {
    errors.push(`nbEtagesHorsSol invalide : ${shape.nbEtagesHorsSol}`);
  }
  if (!Number.isInteger(shape.nbSousSols) || shape.nbSousSols < 0) {
    errors.push(`nbSousSols invalide : ${shape.nbSousSols}`);
  }
  if (typeof shape.typeOperationFoncier !== "string" || shape.typeOperationFoncier.length === 0) {
    errors.push(`typeOperationFoncier invalide : "${shape.typeOperationFoncier}"`);
  }
  return { ok: errors.length === 0, errors };
}
