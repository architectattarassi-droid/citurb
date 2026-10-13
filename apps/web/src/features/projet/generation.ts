/**
 * Génération des jalons d'un projet (back-office, à la création) : sélection
 * dans le référentiel selon les caractéristiques (`jalonsDuProjet`), puis
 * instantané figé envoyé à POST /api/cc/projets (définitions des jalons +
 * dictionnaire des exigences, normes, modèles et titres de phases utilisés).
 *
 * Chargé à la demande : il embarque le référentiel complet (≈ 1,5 Mo de JSON),
 * jamais servi aux membres de l'espace projet.
 */
import { jalonsDuProjet, referentiel, type Projet, type Referentiel } from "../../domain/referentiel";
import type { Exigence, FichierReferentiel, ModeleDocument, Norme } from "../../domain/referentiel/types";
import { LOTS_SECOND_OEUVRE, PHASES_FIXES } from "../../../../../packages/contracts/src/phases.catalog";

export type Caracteristiques = {
  type: Projet["type"]; sousSols: number; etagesHorsSol: number; hauteurM?: number; zoneSismique?: number;
  erp: boolean; ascenseur: boolean; piscine: boolean;
};

const fichiers = import.meta.glob<FichierReferentiel>("../../domain/referentiel/data/*.json", { eager: true, import: "default" });

/** « domaine@version » de chaque fichier du référentiel, triés. */
export function versionReferentiel(liste: Pick<FichierReferentiel, "domaine" | "version">[] = Object.values(fichiers)): string {
  return liste.map((f) => `${f.domaine}@${f.version}`).sort().join(" ") || "vide";
}

/** Titres des phases (catalogue des phases + gabarits par niveau). */
export function titresPhases(): Record<string, string> {
  const t: Record<string, string> = { "85_SOUS_SOL": "Sous-sol", "86_PLANCHER": "Plancher" };
  for (const p of PHASES_FIXES) t[p.code] = p.title;
  for (const l of LOTS_SECOND_OEUVRE) t[l.code] = l.title;
  return t;
}

export function versProjet(c: Caracteristiques): Projet {
  const p = {
    type: c.type, sousSol: c.sousSols > 0, sousSols: c.sousSols, etagesHorsSol: c.etagesHorsSol,
    hauteurM: c.hauteurM, zoneSismique: c.zoneSismique, erp: c.erp, ascenseur: c.ascenseur, piscine: c.piscine,
  };
  return p as Projet;
}

export type Instantane = {
  jalons: Record<string, unknown>[];
  dictionnaire: { exigences: Record<string, Exigence>; normes: Record<string, Norme>; modeles: Record<string, ModeleDocument>; phases: Record<string, string> };
};

/** Jalons applicables + dictionnaire minimal (seulement ce que les jalons citent). */
export function instantane(c: Caracteristiques, r: Referentiel = referentiel(), phases: Record<string, string> = titresPhases()): Instantane {
  const js = jalonsDuProjet(versProjet(c), r);
  const exigences: Record<string, Exigence> = {}, normes: Record<string, Norme> = {}, modeles: Record<string, ModeleDocument> = {};
  const titres: Record<string, string> = {};
  const jalons = js.map(({ exigencesDetail, normesDetail, modelesDetail, conditions: _c, ...j }) => {
    for (const e of exigencesDetail) exigences[e.id] = e;
    for (const n of normesDetail) normes[n.id] = n;
    for (const m of modelesDetail) modeles[m.id] = m;
    const ph = j.phaseGabarit ?? j.phase;
    if (phases[ph]) titres[ph] = phases[ph];
    return {
      ...j,
      exigences: exigencesDetail.map((e) => e.id),
      documents: modelesDetail.map((m) => m.id),
      prerequis: j.prerequis ?? [],
      pointArret: j.pointArret === true,
    };
  });
  // Normes citées par les exigences retenues seulement (normesDetail inclut celles d'exigences non applicables).
  const citees = new Set(Object.values(exigences).flatMap((e) => e.normes));
  for (const id of Object.keys(normes)) if (!citees.has(id)) delete normes[id];
  return { jalons, dictionnaire: { exigences, normes, modeles, phases: titres } };
}
