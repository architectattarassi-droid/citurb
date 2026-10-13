/**
 * Demande de prix multi-matériaux (phase 1 de l'achat, gratuite) : le panier
 * de la matériauthèque devient UN lead (porte P6, source MATERIAUX) visible
 * dans /cc/leads. CITURBAREA répond par sa propre offre (négoce) ou relaie la
 * demande aux fournisseurs approuvés de la région (place de marché) ; les
 * coordonnées des fournisseurs ne sont jamais exposées.
 * Fonctions pures (tests : demandePrix.test.ts).
 */
import { materiau } from "./catalogue";
import { unitesVente } from "./conversions";
import { prixVille } from "./reference";
import { regionDe } from "./regions";

export const MAX_LIGNES = 30;
export const SOURCE_DEMANDE = "MATERIAUX";
export const SOURCE_SIGNALEMENT = "MATERIAUX_SIGNALEMENT";

export interface LignePanier {
  code: string;
  quantite: number;
  /** Code d'unité de vente (uniteRef par défaut). */
  unite: string;
}

export interface LigneDemande extends LignePanier {
  libelle: string;
  uniteLibelle: string;
  /** Quantité convertie en uniteRef (pour le bordereau des fournisseurs). */
  quantiteRef: number;
  uniteRef: string;
  /** Estimation HT au prix de référence de la ville (indicatif). */
  estimationHT: number | null;
}

export function normaliserLigne(l: LignePanier): LigneDemande | null {
  const r = materiau(l.code);
  if (!r || !(l.quantite > 0) || !Number.isFinite(l.quantite)) return null;
  const u = unitesVente(r).find((x) => x.code === l.unite) || unitesVente(r)[0];
  const quantite = Math.min(Math.round(l.quantite * 100) / 100, 1e7);
  const quantiteRef = Math.round(quantite * u.facteur * 1000) / 1000;
  return { code: r.code, quantite, unite: u.code, libelle: r.libelle, uniteLibelle: u.libelle, quantiteRef, uniteRef: r.uniteRef, estimationHT: null };
}

/** Ajoute ou cumule une ligne (même code et même unité) ; borne à MAX_LIGNES. */
export function ajouterAuPanier(panier: LignePanier[], l: LignePanier): LignePanier[] {
  const i = panier.findIndex((x) => x.code === l.code && x.unite === l.unite);
  if (i >= 0) return panier.map((x, k) => (k === i ? { ...x, quantite: x.quantite + l.quantite } : x));
  return panier.length >= MAX_LIGNES ? panier : [...panier, l];
}

export interface Demande {
  lignes: LigneDemande[];
  ville: string;
  region: string | null;
  estimationHT: number | null;
}

export function construireDemande(panier: LignePanier[], ville: string): Demande {
  const lignes = panier.map(normaliserLigne).filter((x): x is LigneDemande => !!x).slice(0, MAX_LIGNES).map((l) => {
    const p = prixVille(l.code, ville);
    return { ...l, estimationHT: p ? Math.round(p.ref * l.quantiteRef) : null };
  });
  const connues = lignes.filter((l) => l.estimationHT != null);
  return {
    lignes, ville: ville.trim(), region: regionDe(ville),
    estimationHT: connues.length === lignes.length && lignes.length ? connues.reduce((a, l) => a + (l.estimationHT || 0), 0) : null,
  };
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Résumé lisible (message du lead, alerte e-mail, liste /cc/leads). */
export function resumeDemande(d: Demande): string {
  const l = d.lignes.map((x) => `${x.libelle} × ${fmt(x.quantite)} ${x.uniteLibelle}`).join(" ; ");
  return `Demande de prix matériaux — livraison ${d.ville || "ville non précisée"} : ${l}`.slice(0, 1900);
}

/** Bloc meta.wizard du lead (≤ 16 Ko : 30 lignes au plus). */
export function wizardDemande(d: Demande, fournisseursRegion: number | null) {
  return {
    demandePrix: {
      version: 1,
      ville: d.ville,
      region: d.region,
      lignes: d.lignes.map(({ code, libelle, quantite, unite, uniteLibelle, quantiteRef, uniteRef, estimationHT }) =>
        ({ code, libelle, quantite, unite, uniteLibelle, quantiteRef, uniteRef, estimationHT })),
      estimationHT: d.estimationHT,
      fournisseursRegion,
    },
  };
}
