/**
 * Surfaces du projet calculées depuis la PARCELLE, avec la règle métier du
 * cabinet (command-center/modules/dossiers/parcelleSP.ts, portée de
 * P1Landing) : CES selon le type (villa isolée 0,3 / jumelée 0,4 / en bande
 * 0,5 ; immeuble 1,0 / maison de ville 0,7 / RDC commercial 0,7 ou 1,0),
 * étages × 1,1 si voie ≥ 12 m, sous-sol = emprise, cour réglementaire pour
 * l'immeuble à une façade, forfait cage + buanderie + terrasse de 24 m².
 */
import {
  decomposeParcelleSP, type DecompositionSP, type ImmeubleType, type ParcelleInput, type RdcCourMode, type VillaType,
} from "../../command-center/modules/dossiers/parcelleSP";
import type { ProjetInput } from "./metre";

export type ParcelleChiffrage = {
  villaType?: VillaType;
  immeubleType?: ImmeubleType;
  /** Immeuble : 1 façade (mitoyen) ou ≥ 2. */
  facades?: number;
  galerie?: boolean;
  rdcCourMode?: RdcCourMode;
  courSurface?: number;
  /** Voie ≥ 12 m : porte-à-faux, étages × 1,1. */
  voieLarge?: boolean;
};

/** Côtés mitoyens par défaut selon le type (modifiable à l'étape 2). */
export function mitoyenneteParDefaut(type: ProjetInput["type"], p?: ParcelleChiffrage | null): number | undefined {
  if (!p) return undefined;
  if (type === "VILLA") return p.villaType === "bande" ? 2 : p.villaType === "jumelee" ? 1 : 0;
  return Number(p.facades ?? 2) >= 2 ? 2 : 3;
}

export function parcelleInput(input: ProjetInput): ParcelleInput | null {
  const p = input.parcelle;
  if (!p || !(input.surfaceTerrain && input.surfaceTerrain > 0)) return null;
  const villa = input.type === "VILLA";
  return {
    bati: villa ? "villa" : "immeuble",
    surfaceTerrain: input.surfaceTerrain,
    etages: Math.max(0, Math.round(input.niveaux) - 1),
    voieLarge: !!p.voieLarge,
    sousSol: !!(input.sousSol && input.sousSol.profondeur > 0),
    villaType: villa ? (p.villaType ?? "isolee") : undefined,
    immeubleType: villa ? undefined : (p.immeubleType ?? (input.type === "MAISON" ? "maison_ville" : input.type === "MIXTE" ? "rdc_commercial" : "standard")),
    facades: p.facades ?? 2,
    galerie: p.galerie,
    rdcCourMode: p.rdcCourMode,
    courSurface: p.courSurface,
  };
}

/**
 * Projet dont la surface plancher, l'emprise et la surface du sous-sol sont
 * déduites de la parcelle (si `parcelle` est renseigné), sinon inchangé.
 */
export function resoudreProjet(input: ProjetInput): { projet: ProjetInput; decomposition: DecompositionSP | null } {
  const pi = parcelleInput(input);
  const d = pi ? decomposeParcelleSP(pi) : null;
  if (!d || d.rdc <= 0) return { projet: input, decomposition: null };
  const horsSol = d.rdc + d.etages.reduce((s, x) => s + x, 0) + d.forfait;
  return {
    decomposition: d,
    projet: {
      ...input,
      surfacePlancher: Math.round(horsSol * 100) / 100,
      emprise: Math.round(d.rdc * 100) / 100,
      sousSol: input.sousSol && input.sousSol.profondeur > 0 ? { ...input.sousSol, surface: Math.round(d.sousSol * 100) / 100 } : null,
      mitoyennete: input.mitoyennete ?? mitoyenneteParDefaut(input.type, input.parcelle),
    },
  };
}
