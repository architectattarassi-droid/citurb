/**
 * Calcul du devis P2 — fonction pure, sans I/O, exécutable des deux côtés.
 *
 * Doctrine (arbitrage du propriétaire) :
 *   - le barème CNOA 2021 est un PLANCHER déontologique, pas un prix ;
 *   - le prix proposé est le coût réel d'exécution, bas de la fourchette du
 *     niveau choisi ;
 *   - le plancher est vérifié à chaque calcul et le résultat le dit.
 *
 *     coutReel     = surfacePlancher × basFourchette(cat, niveau) × nbBatiments
 *     coutPlancher = surfacePlancher × BAREME[cat].costPerM2      × nbBatiments
 *     coutRetenu   = max(coutReel, coutPlancher)
 *     honorairesHT = coutRetenu × HONORAIRES_RATE
 *
 * Les phases A/B/C, la TVA et l'option photos sont inchangées : elles
 * s'appliquent sur honorairesHT comme avant.
 *
 * Le niveau est obligatoire dès que la catégorie en propose plusieurs :
 * aucune valeur de repli silencieuse. Une catégorie à niveau unique (1.2
 * conventionné, 3.1, 3.2, 4.1…) le sélectionne d'office — il n'y a rien à
 * deviner.
 */
import { CategoryCode, FollowMode, P2Section } from "./bareme";
import { Bascule } from "./catalogue";
import { Fourchette } from "./grille";
export type CodeErreurDevis = "categorie_requise" | "categorie_inconnue" | "categorie_section_invalide" | "surface_requise" | "niveau_requis" | "niveau_invalide";
/** Erreur de saisie : l'appelant HTTP la transforme en 400. */
export declare class ErreurDevis extends Error {
    readonly code: CodeErreurDevis;
    constructor(code: CodeErreurDevis, message?: string);
}
export type DevisInput = {
    section: P2Section;
    categoryCode?: string;
    /** Clé de GRILLE_REELLE[cat].niveaux — jamais un multiplicateur. */
    niveau?: string;
    surfacePlancherM2?: number;
    nbBatiments?: number;
    surfaceTerrainHa?: number;
    followMode?: FollowMode;
};
export type DevisResult = {
    ok: true;
    currency: "MAD";
    meta: {
        section: P2Section;
        sectionLabel: string;
        category?: CategoryCode;
        categoryLabel?: string;
        niveau?: string;
        followMode: FollowMode;
        photoOptionAvailable: boolean;
        requiresQuotePersonnalise: boolean;
        /** Catégorie corrigée par une règle de surface du barème. */
        bascule?: Bascule;
    };
    base: {
        surfacePlancherM2?: number;
        nbBatiments: number;
        /** Conservé : bas de fourchette appliqué, en DH/m². */
        coutConstructionM2?: number;
        /** Conservé pour l'affichage historique = coutRetenu. */
        coutTravauxEstime?: number;
        coutReel?: number;
        coutPlancher?: number;
        coutRetenu?: number;
        fourchette?: Fourchette;
        surfaceTerrainHa?: number;
    };
    conformite?: {
        plancherRespecte: boolean;
        categorie: CategoryCode;
        plancherM2: number;
    };
    honoraires: {
        rate: number;
        totalHT: number | null;
        tvaRate: number;
        tva: number | null;
        totalTTC: number | null;
        breakdown: {
            phaseA_esquisseAutorisation: number | null;
            phaseB_dceCps: number | null;
            phaseC_suivi: number | null;
        };
    };
    visaCroa: {
        payableSeparately: true;
        note: string;
    };
    decennale: {
        applicable: boolean;
        options?: ("PROMOTEUR_GARDE" | "CITURBAREA_PORTE" | "CONSTRUCTEUR_INITIAL")[];
        note: string;
    };
    notes: string[];
};
export declare const VISA_CROA_NOTE = "Le visa du contrat par le Conseil R\u00E9gional de l'Ordre des Architectes (CROA) est obligatoire avant d\u00E9p\u00F4t du dossier d'autorisation (Chap V R\u00E8glement Int\u00E9rieur CNOA 2024, d\u00E9lai max 15 jours calendaires). Factur\u00E9 s\u00E9par\u00E9ment, payable directement via plateforme CITURBAREA \u2014 revers\u00E9 au CROA territorialement comp\u00E9tent.";
/** Niveau effectif : exigé dès qu'il y a un choix, déduit s'il n'y en a qu'un. */
export declare function resoudreNiveau(categorie: CategoryCode, niveau?: string): string;
export declare function computeQuote(input: DevisInput): DevisResult;
