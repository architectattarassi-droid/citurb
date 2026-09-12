/**
 * Catalogue des natures de projet — dérivé du barème, pas l'inverse.
 *
 * Remplace NATURE_FAMILIES / NATURE_PROJET_OPTIONS de P2Home.tsx, qui
 * contredisaient le barème : « petit collectif ≤ R+4 » alors que la catégorie
 * 3.1 dit « R+4 et plus », collectif démarrant à R+5, école et mosquée
 * séparées alors que 5.3 les regroupe, aménagement découpé par activité alors
 * que 6.1/6.2 se découpent par surface.
 *
 * Règle unique : chaque sous-type mène à UNE catégorie du barème. Quand le
 * niveau choisit la catégorie (collectif, villas), `categorieParNiveau` porte
 * la correspondance — le niveau ne multiplie jamais un coût.
 *
 * Les libellés sont en français ; le front les traduit par clé i18n
 * (`portes.p2.nature.<value>`) et retombe sur `label` en l'absence de clé.
 */
import { CategoryCode } from "./bareme";
export type FamilleCode = "habitat_r3" | "collectif" | "villa" | "gr" | "lot" | "epig" | "amg" | "expertise" | "autre";
export type Famille = {
    code: FamilleCode;
    categorie: string;
    titre: string;
    sous: string;
};
export type SousType = {
    value: string;
    label: string;
    famille: FamilleCode;
    /** Catégorie fixe du barème. */
    categorie?: CategoryCode;
    /** Catégorie choisie par le niveau (le niveau ne multiplie pas, il oriente). */
    categorieParNiveau?: Record<string, CategoryCode>;
    /** Hors barème : aucun devis automatique n'est calculé. */
    horsBareme?: "LOT" | "EXPERTISE" | "AUTRE";
};
/** 1.1 est plafonnée à 500 m² de plancher par le barème lui-même. */
export declare const SEUIL_1_1_M2 = 500;
/** 6.1 s'arrête à 50 m² ; au-delà c'est 6.2 — critère de surface, pas d'activité. */
export declare const SEUIL_AMG_M2 = 50;
export declare const FAMILLES: Famille[];
export declare const SOUS_TYPES: SousType[];
export declare function sousTypesDeFamille(famille: FamilleCode): SousType[];
export declare function sousTypeDe(value: string): SousType | undefined;
/** Niveaux proposés pour un sous-type (union des catégories qu'il peut viser). */
export declare function niveauxDeSousType(sousType: SousType): string[];
export type RaisonBascule = "surface_sup_500" | "amg_petite_surface" | "amg_grande_surface";
export type Bascule = {
    de: CategoryCode;
    vers: CategoryCode;
    raison: RaisonBascule;
};
/**
 * Catégorie finale, après application des règles de surface du barème.
 *
 * - 1.1 au-delà de 500 m² de plancher → 3.1 (le barème plafonne 1.1).
 * - AMG : 6.1 en deçà de 50 m², 6.2 au-delà — quelle que soit l'activité.
 *
 * Appliquée des DEUX côtés (front hors ligne et API) pour que les deux
 * calculs donnent le même résultat.
 */
export declare function resoudreCategorie(categorie: CategoryCode, surfacePlancherM2: number | null | undefined): {
    categorie: CategoryCode;
    bascule?: Bascule;
};
