/**
 * Barème CNOA 2021 — plancher déontologique.
 *
 * Déplacé tel quel depuis apps/api/src/tomes/tome-2/p2/pricing.service.ts :
 * aucune valeur n'a été modifiée. Ce fichier est la SEULE définition du barème
 * dans le dépôt ; l'API et le front l'importent, personne ne le recopie.
 *
 * Ces montants ne sont pas des prix de vente : ce sont les coûts de
 * construction planchers au m² sous lesquels un architecte ne peut pas
 * calculer ses honoraires. Le prix proposé au client vient de GRILLE_REELLE
 * (grille.ts), et le plancher est vérifié à chaque calcul.
 *
 * Sources :
 *  - Contrat type unifié d'Architecte Construction (CNOA 28-02-2024) — Annexe 2
 *  - Règlement Intérieur Ordre National des Architectes (CNOA 28-02-2024)
 *  - Loi 016-89 (exercice profession architecte)
 *  - Loi 12-90 (urbanisme) + Loi 25-90 (lotissements)
 */
export type P2Section = "IMM" | "GR" | "LOT" | "EPIG" | "AMG";
export type FollowMode = "ON_SITE" | "PHOTOS";
export type CategoryCode = "1.1" | "1.2" | "3.1" | "3.2" | "3.3" | "4.1" | "4.2" | "4.3" | "4.4" | "4.5" | "4.6" | "5.1" | "5.2" | "5.3" | "5.4" | "5.5" | "5.6" | "5.7" | "5.8" | "5.9" | "6.1" | "6.2";
export type CategoryDef = {
    label: string;
    costPerM2: number;
    validSections: P2Section[];
    photoOptionAvailable: boolean;
    notes?: string;
};
export declare const BAREME_CNOA_2021: Record<CategoryCode, CategoryDef>;
export declare const SECTION_LABELS: Record<P2Section, string>;
/** Taux d'honoraires et de phases — article 7 du contrat type unifié CNOA. */
export declare const HONORAIRES_RATE = 0.05;
export declare const TVA_RATE = 0.2;
export declare const PHASE_A_RATE = 0.4;
export declare const PHASE_B_RATE = 0.3;
export declare const PHASE_C_ON_SITE_RATE = 0.3;
export declare const PHASE_C_PHOTOS_RATE = 0.1;
export declare const CATEGORY_CODES: CategoryCode[];
export declare function estCategorieConnue(code: string): code is CategoryCode;
/** Catégories valides pour une section (alimente GET /p2/categories). */
export declare function categoriesDeSection(section: P2Section): CategoryCode[];
