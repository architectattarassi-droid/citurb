/**
 * phase-mapping.ts — Helper de traduction bidirectionnel legacy ↔ v7.
 *
 * Pendant la migration des codes de phase legacy `PHASE_NN_xxx` vers les
 * codes du catalogue v7 (`00_BRIEF`, `84_FONDATIONS`, etc.), ce helper assure :
 *   - une traduction déterministe code legacy → code v7,
 *   - l'idempotence : un code déjà v7 est retourné tel quel,
 *   - une défense en profondeur côté snapshot (JOIN robuste même si un
 *     record legacy résiduel traîne en base après la migration data).
 *
 * Source de vérité du mapping : décision Yassine (vague C, validée). Audit
 * prod confirme 0 record sur les codes ambigus → mapping FIXE sans branche
 * conditionnelle sur le statut.
 */

import { Logger } from "@nestjs/common";

const log = new Logger("PhaseMapping");

/**
 * Table de traduction des 13 codes legacy vers les codes v7. Validée
 * sur la base prod (audit pré-vague C : 10 records `PHASE_00_BRIEF` + 0
 * record sur les 12 autres codes legacy).
 *
 * Le mapping `PHASE_05_AUTORISATION → 30_DOSSIER_AUTORISATION` est FIXE
 * (décision Yassine — 0 record en prod → ambiguïté sans objet ; cas le
 * plus prudent : pointer sur le point de départ du parcours autorisation).
 */
export const LEGACY_TO_V7: Record<string, string> = {
  PHASE_00_BRIEF: "00_BRIEF",
  PHASE_01_ESQUISSE: "10_ESQUISSE",
  PHASE_02_APS: "12_APS",
  PHASE_03_APD: "14_APD",
  PHASE_04_MANDAT_BET: "15_MANDAT_BET",
  PHASE_05_AUTORISATION: "30_DOSSIER_AUTORISATION",
  PHASE_06_DOSSIER_EXECUTION: "40_DOSSIER_EXECUTION",
  PHASE_07_DCE: "50_DCE",
  PHASE_08_MANDATS: "54_ATTRIBUTION_MARCHE",
  PHASE_09_OUVERTURE_CHANTIER: "80_OUVERTURE_CHANTIER",
  PHASE_RECEPTION_PROVISOIRE: "93_RECEPTION_PROVISOIRE",
  PHASE_RECEPTION_DEFINITIVE: "97_RECEPTION_DEFINITIVE",
  PHASE_PERMIS_HABITER: "96_PERMIS_HABITER",
};

/**
 * Vrai si le code suit la convention legacy `PHASE_NN_xxx` (préfixe
 * `PHASE_`). Pas de check sur l'existence du code dans la table — un
 * code legacy "inventé" reste considéré comme legacy pour permettre
 * un log.warn ciblé dans `toV7()`.
 */
export function isLegacyCode(code: string): boolean {
  return typeof code === "string" && code.startsWith("PHASE_");
}

/**
 * Reverse map v7 → legacy (auto-construite depuis LEGACY_TO_V7). Permet
 * `phaseVariants()` de retrouver la forme legacy d'un code v7 donné.
 */
const V7_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_V7).map(([legacy, v7]) => [v7, legacy]),
);

/**
 * Retourne toutes les écritures possibles d'un code de phase (legacy + v7)
 * sans doublons. Utilisé dans les `WHERE phase IN (...)` Prisma pour matcher
 * un record indépendamment du format en base.
 *
 * Exemples :
 *   phaseVariants('PHASE_00_BRIEF') → ['PHASE_00_BRIEF', '00_BRIEF']
 *   phaseVariants('00_BRIEF')       → ['00_BRIEF', 'PHASE_00_BRIEF']
 *   phaseVariants('84_FONDATIONS')  → ['84_FONDATIONS']                 (v7 sans équivalent legacy)
 *   phaseVariants('PHASE_99_X')     → ['PHASE_99_X']                    (legacy inconnu → tel quel)
 */
export function phaseVariants(code: string): string[] {
  const variants = new Set<string>();
  variants.add(code);
  const v7 = toV7(code); // si code legacy connu → ajoute v7 ; sinon retourne code tel quel (déjà ajouté)
  variants.add(v7);
  const legacy = V7_TO_LEGACY[v7];
  if (legacy) variants.add(legacy);
  return [...variants];
}

/**
 * Traduit un code de phase legacy vers son équivalent v7. Idempotent :
 *  - si le code est déjà v7 (n'a pas le préfixe `PHASE_`), retourne tel quel,
 *  - si legacy connu, retourne la traduction,
 *  - si legacy inconnu (préfixe `PHASE_` mais absent de la table), log.warn
 *    une fois et retourne le code d'origine (jamais throw — la migration
 *    data ne doit pas être bloquée par un cas marginal).
 *
 * Le warn permet de découvrir d'éventuels codes legacy "exotiques" non
 * listés dans la table (qui devraient être ajoutés à `LEGACY_TO_V7`).
 */
export function toV7(code: string): string {
  if (!isLegacyCode(code)) return code; // déjà v7 ou code arbitraire non-legacy
  const v7 = LEGACY_TO_V7[code];
  if (v7) return v7;
  // Legacy avec préfixe PHASE_ mais absent de la table : signal de drift.
  log.warn(`[phase-mapping] code legacy inconnu (non listé dans LEGACY_TO_V7) : "${code}" — retourné tel quel`);
  return code;
}
