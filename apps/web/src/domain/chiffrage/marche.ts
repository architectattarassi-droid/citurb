/**
 * Prix marché des fournisseurs Cercles injectés dans le chiffrage.
 *
 * Source : GET /api/prix/materiaux et GET /api/prix/ouvrages (Pages
 * Functions, agrégat des offres approuvées par région, agregerMarche de
 * domain/materiaux/marche.ts ; chargement : domain/materiaux/prixMarche.ts).
 * Le front appelle `definirPrixMarche` une fois les données reçues ;
 * `debourse` et `prixOuvrage` (prix.ts) les lisent.
 *
 * Règle : prix fournisseur vérifié utilisé À LA PLACE du prix de recherche
 * quand au moins 3 fournisseurs distincts couvrent la région (fiabilité A).
 * Sous 3 fournisseurs, aucun prix n'est publié (confidentialité, loi 104-12) :
 * la ligne affiche seulement le nombre d'offres à côté du prix de recherche.
 *   - matériau : médiane par uniteRef du code CIT × facteur de
 *     CORRESPONDANCE_CIT (prix par unité du composant) ; pas de coefficient
 *     régional (le prix marché est déjà celui de la région) ;
 *   - ouvrage « fourni-posé » : remplace le prix unitaire de vente ;
 *   - ouvrage « pose seule » : remplace la main-d'œuvre et le petit
 *     matériel du déboursé (fournitures inchangées, K appliqué ensuite).
 */
import type { Marche } from "../materiaux/marche";
import { CORRESPONDANCE_CIT } from "./correspondanceCIT";

export interface DonneesMarche {
  region: string | null;
  genereLe: string;
  /** Code CIT → marché par uniteRef (champ `marche` de GET /api/prix/materiaux). */
  materiaux: Record<string, Marche>;
  /** Code d'ouvrage → marché par unité d'ouvrage, par nature (GET /api/prix/ouvrages). */
  ouvrages: Record<string, { FOURNI_POSE?: Marche; POSE?: Marche }>;
}

export interface InfoMarche {
  /** null sous 3 fournisseurs (prix non publié). */
  mediane: number | null;
  min: number | null;
  max: number | null;
  nbFournisseurs: number;
  plusRecente: string | null;
  region: string | null;
  /** Vrai : remplace le prix de recherche (≥ 3 fournisseurs) ; faux : nombre d'offres affiché à côté. */
  applique: boolean;
}

let courant: DonneesMarche | null = null;
let version = 0;

/** Installe (ou retire avec null) les prix marché utilisés par le chiffrage. */
export function definirPrixMarche(d: DonneesMarche | null): void {
  courant = d;
  version++;
}
export const prixMarcheActifs = (): DonneesMarche | null => courant;
/** Change à chaque définition : entre dans les clés de cache du déboursé. */
export const versionMarche = (): number => version;

const fois = (x: number | null, k: number) => (x == null ? null : Math.round(x * k * 100) / 100);
const info = (p: Marche, facteur = 1): InfoMarche => ({
  mediane: fois(p.mediane, facteur), min: fois(p.min, facteur), max: fois(p.max, facteur), nbFournisseurs: p.nbFournisseurs,
  plusRecente: p.plusRecente, region: courant?.region ?? null, applique: p.fiabilite === "A" && p.mediane != null,
});

/** Marché d'un composant matériau du référentiel, par unité du composant (sac, m³…). */
export function marcheMateriau(refId: string): InfoMarche | null {
  const c = CORRESPONDANCE_CIT[refId];
  const p = c && courant?.materiaux[c.cit];
  return p ? info(p, c.facteur) : null;
}

export function marcheOuvrage(code: string, nature: "FOURNI_POSE" | "POSE"): InfoMarche | null {
  const p = courant?.ouvrages[code]?.[nature];
  return p ? info(p) : null;
}

/** Valeur d'une borne d'un marché appliqué (mediane / min / max non nuls). */
export const valeurBorne = (m: InfoMarche, borne: "min" | "ref" | "max"): number => Number(borne === "ref" ? m.mediane : m[borne]);

export function noteMarche(m: InfoMarche): string {
  const n = `${m.nbFournisseurs} fournisseur${m.nbFournisseurs > 1 ? "s" : ""}`;
  return m.applique
    ? `Prix fournisseurs Cercles vérifiés : médiane de ${n}${m.region ? ` (${m.region})` : ""}, au ${m.plusRecente}`
    : `${n} Cercles vérifié${m.nbFournisseurs > 1 ? "s" : ""} (prix publié à partir de 3)`;
}
