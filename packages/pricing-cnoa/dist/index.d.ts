/**
 * @citurbarea/pricing-cnoa — source unique de la tarification P2.
 *
 * Barème CNOA 2021 (plancher), grille des coûts réels (prix), catalogue des
 * natures de projet et calcul du devis. Importé par l'API (tome-2/p2) et par
 * le front (Porte 2) : aucune valeur de coût, de taux ou de libellé de
 * catégorie ne doit être redéfinie ailleurs.
 *
 * Le calcul est pur : le front le fait tourner tel quel quand l'API ne répond
 * pas, et /p2/quote doit rendre exactement le même résultat.
 */
export { BAREME_CNOA_2021, CATEGORY_CODES, SECTION_LABELS, HONORAIRES_RATE, TVA_RATE, PHASE_A_RATE, PHASE_B_RATE, PHASE_C_ON_SITE_RATE, PHASE_C_PHOTOS_RATE, categoriesDeSection, estCategorieConnue, } from "./bareme";
export type { CategoryCode, CategoryDef, FollowMode, P2Section } from "./bareme";
export { GRILLE_REELLE, basFourchette, estNiveauValide, fourchetteDe, niveauxDe, plancherDe, } from "./grille";
export type { Fourchette, GrilleEntry } from "./grille";
export { FAMILLES, SEUIL_1_1_M2, SEUIL_AMG_M2, SOUS_TYPES, niveauxDeSousType, resoudreCategorie, sousTypeDe, sousTypesDeFamille, } from "./catalogue";
export type { Bascule, Famille, FamilleCode, RaisonBascule, SousType } from "./catalogue";
export { ErreurDevis, VISA_CROA_NOTE, computeQuote, resoudreNiveau } from "./quote";
export type { CodeErreurDevis, DevisInput, DevisResult } from "./quote";
