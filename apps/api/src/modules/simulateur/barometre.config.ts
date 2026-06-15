/**
 * barometre.config.ts — Configuration du simulateur de coût de construction.
 *
 * DOCTRINE : on NE recode PAS le moteur de coût. Le coût de construction au m²
 * provient du barème CNOA 2021 déjà implémenté (BAREME_CNOA_2021, table
 * `costPerM2` par catégorie) dans tomes/tome-2/p2/pricing.service.ts. Ce fichier
 * se contente de :
 *   1. mapper la qualification grand public (type de projet × finition) vers une
 *      catégorie réelle du barème → on réutilise sa valeur costPerM2 ;
 *   2. appliquer un coefficient régional (ajustement marché CITURBAREA) ;
 *   3. ventiler le coût travaux en gros œuvre / second œuvre / finitions ;
 *   4. ajouter les honoraires d'architecte (5 %, taux CNOA déjà utilisé).
 *
 * Les coefficients régionaux et les ratios de ventilation sont des paramètres
 * PRODUIT (pas du moteur réglementaire). Ils sont volontairement conservateurs,
 * documentés et faciles à ajuster ici sans toucher au moteur.
 */

import {
  BAREME_CNOA_2021,
  type CategoryCode,
} from "../../tomes/tome-2/p2/pricing.service";

export type TypeProjet = "PARTICULIER" | "PROMOTEUR";
export type Finition = "ECO" | "STANDARD" | "HAUT_DE_GAMME";
export type VilleSlug =
  | "kenitra"
  | "sale"
  | "rabat"
  | "temara"
  | "harhoura"
  | "mehdiya"
  | "sidi-taibi";

/** Villes couvertes (corridor Rabat-Kénitra). Libellés affichables. */
export const VILLES: { slug: VilleSlug; name: string }[] = [
  { slug: "kenitra", name: "Kénitra" },
  { slug: "sale", name: "Salé" },
  { slug: "rabat", name: "Rabat" },
  { slug: "temara", name: "Témara" },
  { slug: "harhoura", name: "Harhoura" },
  { slug: "mehdiya", name: "Mehdiya" },
  { slug: "sidi-taibi", name: "Sidi Taibi" },
];

export const FINITIONS: { value: Finition; name: string; hint: string }[] = [
  { value: "ECO", name: "Économique", hint: "Matériaux standards, prestations essentielles" },
  { value: "STANDARD", name: "Standard", hint: "Bon rapport qualité/prix, prestations courantes" },
  { value: "HAUT_DE_GAMME", name: "Haut de gamme", hint: "Matériaux nobles, finitions soignées" },
];

/**
 * Mapping (type de projet × finition) → catégorie du barème CNOA 2021.
 * On réutilise directement la valeur costPerM2 de la catégorie pointée
 * (aucune valeur de coût n'est ré-écrite ici).
 *
 *  PARTICULIER (villa / maison individuelle) :
 *    ECO            → "1.1" Habitat RDC/R+3 ≤500 m²        (1900 MAD/m²)
 *    STANDARD       → "4.5" Villas isolées                 (4000 MAD/m²)
 *    HAUT_DE_GAMME  → "4.6" Villas isolées de standing     (6000 MAD/m²)
 *
 *  PROMOTEUR (immeuble collectif R+4 et plus) :
 *    ECO            → "3.1" Immeubles collectifs           (2500 MAD/m²)
 *    STANDARD       → "3.2" Immeubles moyen standing       (3700 MAD/m²)
 *    HAUT_DE_GAMME  → "3.3" Immeubles haut standing        (5000 MAD/m²)
 */
export const CATEGORY_MAP: Record<TypeProjet, Record<Finition, CategoryCode>> = {
  PARTICULIER: { ECO: "1.1", STANDARD: "4.5", HAUT_DE_GAMME: "4.6" },
  PROMOTEUR: { ECO: "3.1", STANDARD: "3.2", HAUT_DE_GAMME: "3.3" },
};

/** Résout le coût de construction au m² (MAD) depuis le barème CNOA réutilisé. */
export function coutM2FromBareme(type: TypeProjet, finition: Finition): number {
  const code = CATEGORY_MAP[type][finition];
  return BAREME_CNOA_2021[code].costPerM2;
}

/**
 * Coefficient régional — ajustement marché CITURBAREA (paramètre produit).
 * Baseline 1.00 = barème national. Rabat (capitale) et la frange côtière
 * résidentielle (Témara/Harhoura) légèrement au-dessus ; reste du corridor
 * proche du barème. Volontairement modéré (±10 %).
 */
export const VILLE_COEFFICIENT: Record<VilleSlug, number> = {
  rabat: 1.1,
  harhoura: 1.08,
  temara: 1.05,
  sale: 1.02,
  kenitra: 1.0,
  mehdiya: 1.0,
  "sidi-taibi": 0.98,
};

/**
 * Ventilation du coût travaux (somme = 1.0). Répartition usuelle gros œuvre /
 * second œuvre / finitions pour la construction neuve au Maroc. Paramètre produit.
 */
export const VENTILATION = {
  grosOeuvre: 0.45,
  secondOeuvre: 0.3,
  finitions: 0.25,
} as const;

/** Honoraires d'architecte : 5 % du coût travaux (taux CNOA déjà appliqué côté P2). */
export const HONORAIRES_RATE = 0.05;

/** Demi-amplitude de la fourchette d'incertitude affichée (±%). */
export const FOURCHETTE_SPREAD = 0.12;

/** Type-guards utilitaires pour valider les entrées publiques. */
export function isTypeProjet(v: unknown): v is TypeProjet {
  return v === "PARTICULIER" || v === "PROMOTEUR";
}
export function isFinition(v: unknown): v is Finition {
  return v === "ECO" || v === "STANDARD" || v === "HAUT_DE_GAMME";
}
export function isVille(v: unknown): v is VilleSlug {
  return VILLES.some((x) => x.slug === v);
}
