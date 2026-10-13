/**
 * Fiche matériau « selon la phase » : ce qui sert en ÉTUDE (poids dans le prix
 * des ouvrages, exigences de conception, article CPS / poste du DQE) et en
 * RÉALISATION (exigences d'exécution et de réception). Le référentiel des
 * jalons (≈ 1,4 Mo) est passé en paramètre : la page le charge à la demande.
 */
import type { CodeLot } from "../chiffrage/lots";
import { LOT_PAR_CODE } from "../chiffrage/lots";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { prixOuvrage } from "../chiffrage/prix";
import { MATERIAUX, prixHT } from "../chiffrage/referentiel";
import type { Exigence, Moment, Norme } from "../referentiel/types";
import { materiau } from "./catalogue";
import { phasesMateriau } from "./phases";
import { COMPOSANTS_PAR_CIT } from "./reference";

export interface PoidsOuvrage {
  ouvrage: string;
  libelle: string;
  unite: string;
  lot: string;
  cps?: string;
  /** Prix unitaire HT de l'ouvrage posé (moteur de chiffrage, base Rabat, entreprise). */
  puOuvrage: number;
  /** Fourniture du matériau par unité d'ouvrage (DH HT, pertes comprises, hors frais et marge). */
  fourniture: number;
  /** Part de la fourniture dans le prix de l'ouvrage. */
  part: number;
}

function qteParUnite(ouvrage: string, composant: string, profondeur = 0): number {
  const o = OUVRAGES[ouvrage];
  if (!o || profondeur > 6) return 0;
  let q = 0;
  for (const c of o.composants) {
    if (c.type === "mat" && c.ref === composant) q += c.qte * (1 + (c.perte ?? 0));
    else if (c.type === "ouv") q += c.qte * qteParUnite(c.ref, composant, profondeur + 1);
  }
  return q;
}

/** Poids du matériau dans le prix de chacun des ouvrages qui l'utilisent (du plus lourd au plus léger). */
export function poidsDansOuvrages(code: string): PoidsOuvrage[] {
  const r = materiau(code);
  if (!r) return [];
  const comps = [...(COMPOSANTS_PAR_CIT[code] || []), ...(r.parent ? COMPOSANTS_PAR_CIT[r.parent] || [] : [])];
  const out: PoidsOuvrage[] = [];
  for (const o of phasesMateriau(code)?.ouvrages || []) {
    const ouv = OUVRAGES[o];
    let pu = 0;
    try { pu = prixOuvrage(o).pu; } catch { continue; }
    const fourniture = comps.reduce((s, c) => s + qteParUnite(o, c.id) * prixHT(MATERIAUX[c.id]), 0);
    if (!(fourniture > 0) || !(pu > 0)) continue;
    out.push({ ouvrage: o, libelle: ouv.libelle, unite: ouv.unite, lot: LOT_PAR_CODE[ouv.lot]?.libelle || ouv.lot, cps: ouv.cps,
      puOuvrage: Math.round(pu), fourniture: Math.round(fourniture * 100) / 100, part: Math.round((fourniture / pu) * 1000) / 1000 });
  }
  return out.sort((a, b) => b.part - a.part);
}

/** Lots du chiffrage concernés par le matériau (via les ouvrages qui le consomment). */
export function lotsMateriau(code: string): CodeLot[] {
  return [...new Set((phasesMateriau(code)?.ouvrages || []).map((o) => OUVRAGES[o]?.lot).filter(Boolean))] as CodeLot[];
}

export interface ExigenceAffichee { id: string; texte: string; criticite: Exigence["criticite"]; normes: string[]; reference?: string; verifie: boolean }

/** Exigences du référentiel des jalons pour les lots du matériau, au moment demandé (les plus critiques d'abord). */
export function exigencesMateriau(
  ref: { exigences: Map<string, Exigence>; normes: Map<string, Norme>; jalons: { lot?: string; exigences: string[] }[] },
  code: string, moments: Moment[], max = 6,
): ExigenceAffichee[] {
  const lots = new Set<string>(lotsMateriau(code));
  if (!lots.size) return [];
  const ids = new Set(ref.jalons.filter((j) => j.lot && lots.has(j.lot)).flatMap((j) => j.exigences));
  const ordre = { BLOQUANT: 0, MAJEUR: 1, MINEUR: 2 };
  return [...ids].map((id) => ref.exigences.get(id)).filter((e): e is Exigence => !!e && moments.includes(e.moment))
    .sort((a, b) => ordre[a.criticite] - ordre[b.criticite])
    .slice(0, max)
    .map((e) => ({ id: e.id, texte: e.texte, criticite: e.criticite, reference: e.reference, verifie: e.verifie,
      normes: e.normes.map((n) => ref.normes.get(n)?.code || n) }));
}
