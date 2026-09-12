/**
 * Grille des coûts réels d'exécution — le PRIX, par opposition au plancher.
 *
 * Valeurs arrêtées par le propriétaire (grille « coûts réels P2 »), reprises
 * à la valeur près : rien n'est arrondi, corrigé ni interpolé ici. Toute
 * évolution passe par ce fichier et par lui seul.
 *
 * Lecture : pour chaque catégorie du barème, `plancher` reprend le barème CNOA
 * et `niveaux` donne des fourchettes de 1 000 DH/m². Le devis applique le BAS
 * de la fourchette (prudent) et affiche la fourchette au client.
 *
 * `[bas, null]` = fourchette ouverte (« 15 000 et plus »).
 *
 * Invariant garanti par test (grille.test.ts) : pour chaque niveau de chaque
 * catégorie, bas ≥ plancher. Si une ligne le viole, la suite échoue et rien
 * n'est livré.
 *
 * Coûts hors terrain, hors honoraires, hors VRD, en DH/m² de plancher.
 */

import { BAREME_CNOA_2021, CategoryCode } from "./bareme";

/** [bas, haut] — haut à null pour une fourchette ouverte. */
export type Fourchette = [number, number | null];

export type GrilleEntry = {
  plancher: number;
  niveaux: Record<string, Fourchette>;
};

export const GRILLE_REELLE: Record<CategoryCode, GrilleEntry> = {
  "1.1": { plancher: 1900, niveaux: { economique: [2500, 3500], moyen: [4000, 5000], haut: [6000, 7000], luxe: [10000, 11000] } },
  "1.2": { plancher: 1900, niveaux: { conventionne: [2000, 3000] } },
  "3.1": { plancher: 2500, niveaux: { economique: [3000, 4000] } },
  "3.2": { plancher: 3700, niveaux: { moyen: [4500, 5500] } },
  "3.3": { plancher: 5000, niveaux: { haut: [7000, 8000], luxe: [12000, 13000] } },
  "4.1": { plancher: 3500, niveaux: { standard: [4000, 5000] } },
  "4.2": { plancher: 4000, niveaux: { standing: [6000, 7000] } },
  "4.3": { plancher: 4000, niveaux: { standard: [4500, 5500] } },
  "4.4": { plancher: 6000, niveaux: { standing: [7000, 8000] } },
  "4.5": { plancher: 4000, niveaux: { standard: [5000, 6000] } },
  "4.6": { plancher: 6000, niveaux: { standing: [8000, 9000], luxe: [12000, 13000] } },
  "5.1": { plancher: 1500, niveaux: { simple: [2000, 3000], equipe: [3000, 4000] } },
  "5.2": { plancher: 2500, niveaux: { simple: [3000, 4000], equipe: [4000, 5000] } },
  "5.3": { plancher: 3500, niveaux: { standard: [4000, 5000], haut: [6000, 7000] } },
  "5.4": { plancher: 2500, niveaux: { standard: [3500, 4500], process: [5000, 6000] } },
  "5.5": { plancher: 3500, niveaux: { standard: [4500, 5500], haut: [6000, 7000] } },
  "5.6": { plancher: 5000, niveaux: { standard: [6000, 7000], haut: [8000, 9000] } },
  "5.7": { plancher: 5500, niveaux: { standard: [7000, 8000], haut: [9000, 10000] } },
  "5.8": { plancher: 7000, niveaux: { standard: [8000, 9000], haut: [10000, 11000] } },
  "5.9": { plancher: 9000, niveaux: { standard: [12000, 13000], luxe: [15000, null] } },
  "6.1": { plancher: 2500, niveaux: { standard: [3000, 4000], haut: [5000, 6000] } },
  "6.2": { plancher: 4500, niveaux: { standard: [5000, 6000], haut: [7000, 8000], luxe: [10000, 11000] } },
};

/** Clés de niveau proposées pour une catégorie, dans l'ordre de déclaration. */
export function niveauxDe(categorie: CategoryCode): string[] {
  return Object.keys(GRILLE_REELLE[categorie].niveaux);
}

export function estNiveauValide(categorie: CategoryCode, niveau: string): boolean {
  return Object.prototype.hasOwnProperty.call(GRILLE_REELLE[categorie].niveaux, niveau);
}

export function fourchetteDe(categorie: CategoryCode, niveau: string): Fourchette | null {
  const f = GRILLE_REELLE[categorie].niveaux[niveau];
  return f ? [f[0], f[1]] : null;
}

/** Bas de fourchette = coût réel appliqué au devis. */
export function basFourchette(categorie: CategoryCode, niveau: string): number | null {
  const f = GRILLE_REELLE[categorie].niveaux[niveau];
  return f ? f[0] : null;
}

/**
 * Le plancher de la grille doit rester celui du barème : la grille ne peut pas
 * diverger du CNOA sans qu'on le voie. Vérifié par test, exposé ici pour que
 * l'appelant puisse contrôler à l'exécution.
 */
export function plancherDe(categorie: CategoryCode): number {
  return BAREME_CNOA_2021[categorie].costPerM2;
}
