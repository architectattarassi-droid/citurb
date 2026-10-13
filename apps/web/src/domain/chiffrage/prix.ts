/**
 * Prix unitaire d'ouvrage posé HT, régionalisé, avec fourchette :
 *   déboursé sec (matériaux + MO chargée + petit matériel) × K.
 * min = intrants au bas de leur fourchette × K min ; max = haut × K max.
 */
import { marcheMateriau, marcheOuvrage, noteMarche, valeurBorne, versionMarche, type InfoMarche } from "./marche";
import { OUVRAGES, type Ouvrage } from "./ouvrages";
import {
  CHARGES_SOCIALES, COEF_K, K_PRIVE, MAIN_OEUVRE, MATERIAUX, PETIT_MATERIEL_MO, REGIMES,
  coutHoraire, prixHT, type Fiabilite, type Regime,
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
  /** Prix fournisseurs Cercles de la région : appliqué (fiabilité A) ou affiché à côté. */
  marche?: InfoMarche;
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
  /** Part du PU soumise à TVA (1 en entreprise ; fournitures seules en tâcheron). */
  assietteTVA: number;
  /** Prix fournisseurs Cercles de l'ouvrage (fourni-posé, pose seule) : appliqués ou affichés à côté. */
  marche?: { fourniPose?: InfoMarche; pose?: InfoMarche };
};

type ResultatDebourse = Debourse & { lignes: LigneSousDetail[]; fiab: Record<Fiabilite, number>; fiabMat: Record<Fiabilite, number> };
const cache = new Map<string, ResultatDebourse>();

function vide(): Record<Fiabilite, number> {
  return { A: 0, B: 0, C: 0, H: 0 };
}

/** Déboursé sec d'une unité d'ouvrage (récursif sur les sous-ouvrages). */
export function debourse(code: string, borne: Borne = "ref", region: CoefsRegion = SANS_REGION): ResultatDebourse {
  const cle = `${code}|${borne}|${region.mat}|${region.mo}|${versionMarche()}`;
  const hit = cache.get(cle);
  if (hit) return hit;
  const o = OUVRAGES[code];
  if (!o) throw new Error(`Ouvrage inconnu : ${code}`);
  let materiaux = 0, mainOeuvre = 0, materiel = 0, moDirecte = 0;
  const fiab = vide();
  const fiabMat = vide();
  const lignes: LigneSousDetail[] = [];
  for (const c of o.composants) {
    if (c.type === "mat") {
      const p = MATERIAUX[c.ref];
      if (!p) throw new Error(`Matériau inconnu : ${c.ref} (ouvrage ${code})`);
      const q = c.qte * (1 + (c.perte ?? 0));
      // Prix fournisseurs vérifiés de la région (≥ 3 offres) à la place du prix de recherche.
      const mm = marcheMateriau(c.ref);
      const pu = mm?.applique ? valeurBorne(mm, borne) : prixHT(p, borne) * region.mat;
      const fi: Fiabilite = mm?.applique ? "A" : p.source.fiabilite;
      const m = q * pu;
      materiaux += m;
      fiab[fi] += m;
      fiabMat[fi] += m;
      const notePerte = c.note ?? (c.perte ? `pertes ${Math.round(c.perte * 100)} %` : undefined);
      lignes.push({
        nature: "MAT", ref: p.id, libelle: p.libelle, unite: p.unite, qte: q, pu, montant: m, fiabilite: fi,
        sourceIds: mm?.applique ? ["cercles-fournisseurs"] : p.source.ids,
        note: mm?.applique ? [noteMarche(mm), notePerte].filter(Boolean).join(" ; ") : notePerte,
        ...(mm ? { marche: mm } : {}),
      });
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
      for (const f of Object.keys(fiab) as Fiabilite[]) { fiab[f] += d.fiab[f] * c.qte; fiabMat[f] += d.fiabMat[f] * c.qte; }
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
  // Pose seule par des artisans vérifiés (≥ 3 offres) : remplace main-d'œuvre et petit matériel.
  const mp = o.interne ? null : marcheOuvrage(code, "POSE");
  if (mp?.applique) {
    const pose = valeurBorne(mp, borne);
    const fournitures = lignes.flatMap((li): LigneSousDetail[] => {
      if (li.nature === "MAT") return [li];
      if (li.nature !== "OUV") return [];
      const d = debourse(li.ref, borne, region);
      return d.materiaux ? [{ ...li, pu: d.materiaux, montant: d.materiaux * li.qte, fiabilite: dominante(d.fiabMat), note: "fournitures seules (pose au prix des artisans)" }] : [];
    });
    const res: ResultatDebourse = {
      materiaux, mainOeuvre: pose, materiel: 0, total: materiaux + pose, fiab: { ...fiabMat, A: fiabMat.A + pose }, fiabMat,
      lignes: [...fournitures, {
        nature: "MO", ref: "POSE", libelle: "Pose (main-d'œuvre et petit matériel)", unite: o.unite, qte: 1, pu: pose, montant: pose,
        fiabilite: "A", sourceIds: ["cercles-fournisseurs"], note: noteMarche(mp), marche: mp,
      }],
    };
    cache.set(cle, res);
    return res;
  }
  const res: ResultatDebourse = { materiaux, mainOeuvre, materiel, total: materiaux + mainOeuvre + materiel, lignes, fiab, fiabMat };
  cache.set(cle, res);
  return res;
}

function dominante(f: Record<Fiabilite, number>): Fiabilite {
  return (Object.keys(f) as Fiabilite[]).reduce((a, b) => (f[b] > f[a] ? b : a), "A");
}

export function coefK(o: Ouvrage, borne: Borne, regime: Regime = "ENTREPRISE"): number {
  const r = REGIMES[regime];
  if (o.sousTraite) return r.kSousTraite[borne];
  return (borne === "ref" ? K_PRIVE : COEF_K[borne]) * r.facteurK[borne];
}

/**
 * Prix de vente d'un déboursé selon le régime. Tâcheron (hors ouvrages
 * sous-traités) : fournitures au coût + (MO sans charges CNSS + petit matériel)
 * × marge du tâcheron.
 */
function prixRegime(d: Debourse, o: Ouvrage, borne: Borne, regime: Regime): { pu: number; assiette: number } {
  const marge = REGIMES[regime].margeMO;
  if (marge && !o.sousTraite) {
    const mo = (d.mainOeuvre / (1 + CHARGES_SOCIALES.taux) + d.materiel) * marge[borne];
    const pu = d.materiaux + mo;
    return { pu, assiette: pu ? d.materiaux / pu : 0 };
  }
  return { pu: d.total * coefK(o, borne, regime), assiette: 1 };
}

/** Prix unitaire de vente HT (posé), régionalisé, avec fourchette. */
export function prixOuvrage(code: string, region: CoefsRegion = SANS_REGION, regime: Regime = "ENTREPRISE"): PrixOuvrage {
  const o = OUVRAGES[code];
  if (!o) throw new Error(`Ouvrage inconnu : ${code}`);
  const ref = debourse(code, "ref", region);
  const vente = prixRegime(ref, o, "ref", regime);
  const k = ref.total ? vente.pu / ref.total : coefK(o, "ref", regime);
  const tot = ref.total || 1;
  const partFiabilite = vide();
  for (const f of Object.keys(partFiabilite) as Fiabilite[]) partFiabilite[f] = ref.fiab[f] / tot;
  const fourniPose = marcheOuvrage(code, "FOURNI_POSE");
  const pose = marcheOuvrage(code, "POSE");
  const marche = fourniPose || pose ? { ...(fourniPose ? { fourniPose } : {}), ...(pose ? { pose } : {}) } : undefined;
  // Fourni-posé par des entreprises vérifiées (≥ 3 offres) : prix de vente constaté, à la place du calcul.
  if (fourniPose?.applique) {
    const pu = valeurBorne(fourniPose, "ref");
    return {
      code, ouvrage: o, debourseSec: ref.total, k: ref.total ? pu / ref.total : 1,
      pu, min: valeurBorne(fourniPose, "min"), max: valeurBorne(fourniPose, "max"), sousDetail: ref.lignes,
      repartition: { materiaux: ref.materiaux, mainOeuvre: ref.mainOeuvre, materiel: ref.materiel, total: ref.total },
      partFiabilite: { A: 1, B: 0, C: 0, H: 0 }, assietteTVA: 1, marche,
    };
  }
  return {
    code,
    ouvrage: o,
    debourseSec: ref.total,
    k,
    pu: vente.pu,
    min: prixRegime(debourse(code, "min", region), o, "min", regime).pu,
    max: prixRegime(debourse(code, "max", region), o, "max", regime).pu,
    sousDetail: ref.lignes,
    repartition: { materiaux: ref.materiaux, mainOeuvre: ref.mainOeuvre, materiel: ref.materiel, total: ref.total },
    partFiabilite,
    assietteTVA: vente.assiette,
    ...(marche ? { marche } : {}),
  };
}
