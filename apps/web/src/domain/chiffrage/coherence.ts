/**
 * Contrôles de cohérence du chiffrage :
 *   1. coût au m² du bâtiment (base RSK) dans la fourchette de grille2026 ;
 *   2. part du gros œuvre (Ministère de l'Habitat 2008 : ≈ 55 % en logement
 *      social ; EnginLoc : 55-60 % éco, 45-50 % standard) ;
 *   3. prix unitaires recoupés avec les prix posés relevés dans
 *      docs/prix/recherche, règle des ±20 % du décret 2-22-431 (art. 44) :
 *      un prix principal qui s'écarte de plus de 20 % doit être justifié.
 */
import { COST_RANGES_MA, type TypeProjet } from "../../command-center/modules/dossiers/costRangesMA";
import type { Resultat } from "./dqe";
import type { TypeBatiment } from "./metre";
import { prixOuvrage, debourse } from "./prix";
import { K_PRIVE } from "./referentiel";

export const TYPE_GRILLE: Record<TypeBatiment, TypeProjet> = { VILLA: "VIL", MAISON: "HMB", IMMEUBLE: "IMM", MIXTE: "MIX" };

export type ControleGrille = { type: TypeProjet; coutM2RSK: number; fourchette: [number, number] | null; ecart: number; ok: boolean };

/** Coût du bâtiment au m² ramené à la base Rabat-Salé-Kénitra, comparé à la grille unique. */
export function controleGrille(r: Resultat): ControleGrille {
  const type = TYPE_GRILLE[r.input.type];
  const fourchette = COST_RANGES_MA[type].ranges[r.input.standing] ?? null;
  const coutM2RSK = r.batimentHT / (r.region.coef || 1) / r.geometrie.surfaceTotale;
  if (!fourchette) return { type, coutM2RSK, fourchette, ecart: 0, ok: true };
  const ecart = coutM2RSK < fourchette[0] ? coutM2RSK / fourchette[0] - 1 : coutM2RSK > fourchette[1] ? coutM2RSK / fourchette[1] - 1 : 0;
  return { type, coutM2RSK, fourchette, ecart, ok: ecart === 0 };
}

export type Recoupement = {
  code: string;
  libelle: string;
  /** Prix CITURBAREA HT ramené à l'unité de la référence. */
  prix: number;
  reference: [number, number];
  /** Référence publiée TTC (convertie en HT par ÷ 1,20). */
  ttc?: boolean;
  sourceIds: string[];
  fichier: string;
  ecart: number;
  ok: boolean;
  note?: string;
};

type Ref = { code: string; libelle: string; prix: () => number; ref: [number, number]; ttc?: boolean; ids: string[]; fichier: string; note?: string };

const pu = (code: string) => prixOuvrage(code).pu;

const REFERENCES: Ref[] = [
  { code: "MAC.01", libelle: "Maçonnerie d'agglos de 20 posée (m²)", prix: () => pu("MAC.01"), ref: [180, 250], ids: ["op-lechantier-agglo20"], fichier: "marche-prive-main-oeuvre" },
  { code: "STR.03", libelle: "Plancher hourdis complet (m²)", prix: () => pu("STR.03"), ref: [350, 545], ids: ["op-lechantier-dalle-hourdis"], fichier: "marche-prive-main-oeuvre" },
  { code: "STR.03+ETA.01+MAC.06", libelle: "Toiture-terrasse hourdis + forme + enduit sous face (m²)", prix: () => pu("STR.03") + pu("ETA.01") + pu("MAC.06"), ref: [600, 600], ids: ["obs-tet20-toiture-12-4"], fichier: "marches-publics", note: "Observatoire de Tétouan 2020, non revalorisé" },
  { code: "FON.08+MAC.07+RSO.01", libelle: "Plancher bas : dallage + chape + carrelage (m²)", prix: () => pu("FON.08") + pu("MAC.07") + pu("RSO.01"), ref: [512, 512], ids: ["obs-tet20-plancher-bas"], fichier: "marches-publics", note: "Observatoire de Tétouan 2020, non revalorisé" },
  { code: "STR.08", libelle: "Acrotère posé (ml)", prix: () => pu("STR.08"), ref: [250, 400], ids: ["op-lechantier-acrotere"], fichier: "marche-prive-main-oeuvre" },
  { code: "STR.06", libelle: "Escalier béton, une volée (u)", prix: () => pu("STR.06") * 1.8, ref: [8000, 15000], ids: ["op-lechantier-escalier"], fichier: "marche-prive-main-oeuvre", note: "1,8 m³ par volée (hypothèse str.escalier)" },
  { code: "X.COFFRAGE", libelle: "Coffrage de dalle (m²)", prix: () => debourse("X.COFFRAGE").total * K_PRIVE, ref: [120, 200], ids: ["coffrage-dalle-lcgo"], fichier: "materiaux-gros-oeuvre" },
  { code: "FON.01", libelle: "Béton de propreté mis en œuvre (m³)", prix: () => pu("FON.01") / 0.1, ref: [700, 900], ids: ["bpe-proprete-lcgo"], fichier: "materiaux-gros-oeuvre", note: "La référence est à peine supérieure au prix du BPE B15 livré (750-900) : main-d'œuvre et marge absentes" },
  { code: "ETA.02", libelle: "Étanchéité SBS bicouche posée (m²)", prix: () => pu("ETA.02"), ref: [110, 160], ttc: true, ids: ["op-lechantier-etanch-systemes"], fichier: "marche-prive-main-oeuvre" },
  { code: "ETA.03", libelle: "Protection lourde d'étanchéité (m²)", prix: () => pu("ETA.03"), ref: [80, 140], ids: ["eta-protection-lechantier"], fichier: "materiaux-gros-oeuvre" },
  { code: "MAC.05", libelle: "Enduit de ciment posé (m²)", prix: () => pu("MAC.05"), ref: [35, 160], ids: ["op-lechantier-enduit-ciment", "op-7rafti-enduit"], fichier: "marche-prive-main-oeuvre", note: "Sources contradictoires : 35-65 (LeChantier) contre 80-160 (7rafti)" },
  { code: "FPL.01", libelle: "Faux plafond BA13 posé (m²)", prix: () => pu("FPL.01"), ref: [130, 200], ids: ["op-mano-fauxplafond", "mn-fp-ba13"], fichier: "marche-prive-main-oeuvre" },
  { code: "PEI.01", libelle: "Peinture intérieure fournie et posée (m²)", prix: () => pu("PEI.01"), ref: [30, 60], ids: ["op-archiplan-peinture"], fichier: "marche-prive-main-oeuvre" },
  { code: "ALU.01", libelle: "Fenêtre alu sans RPT posée (m²)", prix: () => pu("ALU.01"), ref: [900, 1350], ids: ["tv-alu-eco-p"], fichier: "materiaux-second-oeuvre" },
  { code: "ALU.02", libelle: "Fenêtre alu RPT double vitrage posée (m²)", prix: () => pu("ALU.02"), ref: [1150, 1800], ids: ["tv-alu-moy-p"], fichier: "materiaux-second-oeuvre" },
  { code: "ALU.03", libelle: "Alu haut de gamme posé (m²)", prix: () => pu("ALU.03"), ref: [1800, 3000], ids: ["tv-alu-haut-p"], fichier: "materiaux-second-oeuvre" },
  { code: "ELE.01", libelle: "Point électrique (u)", prix: () => pu("ELE.01"), ref: [110, 320], ids: ["op-7rafti-elec-point"], fichier: "marche-prive-main-oeuvre" },
  { code: "PLO.01", libelle: "Point d'eau, arrivée + évacuation (u)", prix: () => pu("PLO.01"), ref: [250, 800], ids: ["op-7rafti-plomb-point"], fichier: "marche-prive-main-oeuvre" },
  { code: "MET.01", libelle: "Garde-corps alu posé, pose comprise (ml)", prix: () => pu("MET.01"), ref: [480, 1100], ids: ["lc-gc-alu-std", "lc-gc-pose"], fichier: "materiaux-second-oeuvre", note: "Fourniture 280-450 + pose 200-650" },
];

/** Écart à la fourchette de référence (0 si dedans). */
function ecartFourchette(v: number, [a, b]: [number, number]): number {
  return v < a ? v / a - 1 : v > b ? v / b - 1 : 0;
}

export function recoupements(): Recoupement[] {
  return REFERENCES.map((r) => {
    const ref: [number, number] = r.ttc ? [r.ref[0] / 1.2, r.ref[1] / 1.2] : r.ref;
    const prix = r.prix();
    const ecart = ecartFourchette(prix, ref);
    return { code: r.code, libelle: r.libelle, prix, reference: ref, ttc: r.ttc, sourceIds: r.ids, fichier: r.fichier, ecart, ok: Math.abs(ecart) <= 0.2, note: r.note };
  });
}

export type Coherence = { grille: ControleGrille; partGrosOeuvre: number; recoupements: Recoupement[]; alertes: string[] };

export function coherence(r: Resultat): Coherence {
  const grille = controleGrille(r);
  const rec = recoupements();
  const alertes: string[] = [];
  if (!grille.ok && grille.fourchette) alertes.push(`Coût du bâtiment ${Math.round(grille.coutM2RSK)} DH/m² (base RSK) hors de la grille ${grille.fourchette[0]}-${grille.fourchette[1]} (${grille.ecart > 0 ? "+" : ""}${Math.round(grille.ecart * 100)} %).`);
  for (const x of rec.filter((x) => !x.ok)) alertes.push(`${x.libelle} : ${Math.round(x.prix)} DH contre ${Math.round(x.reference[0])}-${Math.round(x.reference[1])} (${x.ecart > 0 ? "+" : ""}${Math.round(x.ecart * 100)} %) — à justifier.`);
  return { grille, partGrosOeuvre: r.partGrosOeuvre, recoupements: rec, alertes };
}
