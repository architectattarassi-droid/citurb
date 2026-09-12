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
import { CategoryCode } from "./bareme";
/** [bas, haut] — haut à null pour une fourchette ouverte. */
export type Fourchette = [number, number | null];
export type GrilleEntry = {
    plancher: number;
    niveaux: Record<string, Fourchette>;
};
export declare const GRILLE_REELLE: Record<CategoryCode, GrilleEntry>;
/** Clés de niveau proposées pour une catégorie, dans l'ordre de déclaration. */
export declare function niveauxDe(categorie: CategoryCode): string[];
export declare function estNiveauValide(categorie: CategoryCode, niveau: string): boolean;
export declare function fourchetteDe(categorie: CategoryCode, niveau: string): Fourchette | null;
/** Bas de fourchette = coût réel appliqué au devis. */
export declare function basFourchette(categorie: CategoryCode, niveau: string): number | null;
/**
 * Le plancher de la grille doit rester celui du barème : la grille ne peut pas
 * diverger du CNOA sans qu'on le voie. Vérifié par test, exposé ici pour que
 * l'appelant puisse contrôler à l'exécution.
 */
export declare function plancherDe(categorie: CategoryCode): number;
