/**
 * Prix unitaire d'ouvrage posé HT, régionalisé, avec fourchette :
 *   déboursé sec (matériaux + MO chargée + petit matériel) × K.
 * min = intrants au bas de leur fourchette × K min ; max = haut × K max.
 */
import { OUVRAGES, type Ouvrage } from "./ouvrages";
import {
  COEF_K, K_PRIVE, K_SOUS_TRAITANCE, MAIN_OEUVRE, MATERIAUX, PETIT_MATERIEL_MO,
  coutHoraire, prixHT, type Fiabilite,
} from "./referentiel";

export type Borne = "min" | "ref" | "max";
export type CoefsRegion = { mat: number; mo: number };
export const SANS_REGION: CoefsRegion = { mat: 1, mo: 1 };

export type LigneSousDetail = {
  nature: "MAT" | "MO" | "OUV" | "PM";
  ref: string;
  libelle: string;
  unite: string;
  qte: number;
  pu: number;
  montant: number;
  fiabilite: Fiabilite;
  sourceIds: string[];
  note?: string;
};

export type Debourse = { materiaux: number; mainOeuvre: number; materiel: number; total: number };

export type PrixOuvrage = {
  code: string;
  ouvrage: Ouvrage;
  debourseSec: number;
  k: number;
  pu: number;
  min: number;
  max: number;
  /** Décomposition au prix de référence (déboursé sec). */
  sousDetail: LigneSousDetail[];
  repartition: Debourse;
  /** Part du déboursé sec par niveau de fiabilité des prix d'intrants. */
  partFiabilite: Record<Fiabilite, number>;
};

const cache = new Map<string, Debourse & { lignes: LigneSousDetail[]; fiab: Record<Fiabilite, number> }>();

function vide(): Record<Fiabilite, number> {
  return { A: 0, B: 0, C: 0, H: 0 };
}

/** Déboursé sec d'une unité d'ouvrage (récursif sur les sous-ouvrages). */
export function debourse(code: string, borne: Borne = "ref", region: CoefsRegion = SANS_REGION) {
  const cle = `${code}|${borne}|${region.mat}|${region.mo}`;
  const hit = cache.get(cle);
  if (hit) return hit;
  const o = OUVRAGES[code];
  if (!o) throw new Error(`Ouvrage inconnu : ${code}`);
  let materiaux = 0, mainOeuvre = 0, materiel = 0, moDirecte = 0;
  const fiab = vide();
  const lignes: LigneSousDetail[] = [];
  for (const c of o.composants) {
    if (c.type === "mat") {
      const p = MATERIAUX[c.ref];
      if (!p) throw new Error(`Matériau inconnu : ${c.ref} (ouvrage ${code})`);
      const q = c.qte * (1 + (c.perte ?? 0));
      const pu = prixHT(p, borne) * region.mat;
      const m = q * pu;
      materiaux += m;
      fiab[p.source.fiabilite] += m;
      lignes.push({ nature: "MAT", ref: p.id, libelle: p.libelle, unite: p.unite, qte: q, pu, montant: m, fiabilite: p.source.fiabilite, sourceIds: p.source.ids, note: c.note ?? (c.perte ? `pertes ${Math.round(c.perte * 100)} %` : undefined) });
    } else if (c.type === "mo") {
      const t = MAIN_OEUVRE[c.metier];
      const pu = coutHoraire(c.metier, borne) * region.mo;
      const m = c.h * pu;
      mainOeuvre += m;
      moDirecte += m;
      fiab[t.source.fiabilite] += m;
      lignes.push({ nature: "MO", ref: c.metier, libelle: t.libelle, unite: "h", qte: c.h, pu, montant: m, fiabilite: t.source.fiabilite, sourceIds: t.source.ids, note: "temps unitaire : hypothèse" });
    } else {
      const d = debourse(c.ref, borne, region);
      materiaux += d.materiaux * c.qte;
      mainOeuvre += d.mainOeuvre * c.qte;
      materiel += d.materiel * c.qte;
      for (const f of Object.keys(fiab) as Fiabilite[]) fiab[f] += d.fiab[f] * c.qte;
      const so = OUVRAGES[c.ref];
      lignes.push({ nature: "OUV", ref: c.ref, libelle: so.libelle, unite: so.unite, qte: c.qte, pu: d.total, montant: d.total * c.qte, fiabilite: dominante(d.fiab), sourceIds: [], note: c.note });
    }
  }
  if (moDirecte > 0) {
    const pm = moDirecte * PETIT_MATERIEL_MO;
    materiel += pm;
    fiab.H += pm;
    lignes.push({ nature: "PM", ref: "PM", libelle: "Petit matériel et consommables (5 % de la MO)", unite: "%", qte: PETIT_MATERIEL_MO, pu: moDirecte, montant: pm, fiabilite: "H", sourceIds: [] });
  }
  const res = { materiaux, mainOeuvre, materiel, total: materiaux + mainOeuvre + materiel, lignes, fiab };
  cache.set(cle, res);
  return res;
}

function dominante(f: Record<Fiabilite, number>): Fiabilite {
  return (Object.keys(f) as Fiabilite[]).reduce((a, b) => (f[b] > f[a] ? b : a), "A");
}

export function coefK(o: Ouvrage, borne: Borne): number {
  if (o.sousTraite) return K_SOUS_TRAITANCE[borne];
  return borne === "ref" ? K_PRIVE : COEF_K[borne];
}

/** Prix unitaire de vente HT (posé), régionalisé, avec fourchette. */
export function prixOuvrage(code: string, region: CoefsRegion = SANS_REGION): PrixOuvrage {
  const o = OUVRAGES[code];
  if (!o) throw new Error(`Ouvrage inconnu : ${code}`);
  const ref = debourse(code, "ref", region);
  const k = coefK(o, "ref");
  const tot = ref.total || 1;
  const partFiabilite = vide();
  for (const f of Object.keys(partFiabilite) as Fiabilite[]) partFiabilite[f] = ref.fiab[f] / tot;
  return {
    code,
    ouvrage: o,
    debourseSec: ref.total,
    k,
    pu: ref.total * k,
    min: debourse(code, "min", region).total * coefK(o, "min"),
    max: debourse(code, "max", region).total * coefK(o, "max"),
    sousDetail: ref.lignes,
    repartition: { materiaux: ref.materiaux, mainOeuvre: ref.mainOeuvre, materiel: ref.materiel, total: ref.total },
    partFiabilite,
  };
}
