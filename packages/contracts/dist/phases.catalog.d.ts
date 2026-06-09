/**
 * CITURBAREA — CATALOGUE CANONIQUE DES PHASES  (v7 — GO FINAL, post-audit GPT 7 passes, validation runtime complète)
 * ============================================================================
 * Source de vérité unique pour TOUTES les phases d'un dossier P1/P2.
 *
 * Doctrine figée :
 *   - P3 n'est PAS une porte séparée — réception provisoire, levée de réserves,
 *     conformité administrative, permis d'habiter et réception définitive sont
 *     les phases FINALES de P1 (particulier, CIN) et P2 (promoteur, RC/ICE).
 *     Même cycle ; seul le profil du maître d'ouvrage diffère.
 *   - nbPlanchers = nbSousSols + nbNiveaux, où nbNiveaux INCLUT la dalle de
 *     couverture/terrasse. La terrasse n'est PAS une phase « en plus » : c'est
 *     le dernier plancher porteur. (Décision produit #1 = A.)
 *   - Les lots de second œuvre s'exécutent EN PARALLÈLE, jamais en séquence.
 *   - Progression séquentielle stricte entre phases ; retour arrière géré par la
 *     state machine E0–E12, pas par le catalogue.
 *   - Ordre administratif des réceptions (décision #2 = A) :
 *       réception provisoire → levée réserves → conformité administrative →
 *       permis d'habiter / certificat de conformité → réception définitive
 *       (contractuelle, après garantie).
 * *   - Branches conditionnelles activées par flags du dossier ET BLOQUANTES :
 *     quand un flag est actif, sa branche s'insère dans le graphe et devient
 *     prérequis du jalon aval (le workflow ne peut PAS la contourner).
 *       · lotissement (25-90)        → bloque 30_DOSSIER_AUTORISATION
 *       · securiteIncendie           → bloque 30 (amont) + 96 (conformité aval)
 *       · ascenseur                  → bloque 95_CONFORMITE_ADMINISTRATIVE
 *       · controleTechnique          → injecte CTC (mandat + visa structure)
 *       · financementBancaire        → dossier + accord + déblocage tranches
 *       · raccordementsDefinitifs    → bloque 96_PERMIS_HABITER
 *   - lotsApplicables : undefined = TOUS les lots ; tableau non vide = sélection
 *     explicite ; tableau VIDE = INTERDIT (validateDossier le rejette).
 *   - Escrow (décision = B) : la validation d'un jalon n'auto-libère PAS le
 *     paiement. Elle ouvre un délai de contestation client avant libération.
 *     L'état escrow vit hors catalogue (deposit/blocked/released/disputed/refunded).
 *
 * Ordre (order) : ENTIER par blocs de 100 (ex. 8400, 8500, 8510, 8600…) pour
 *   éviter toute collision de tri, même avec de nombreux niveaux/sous-sols.
 *
 * Slugs (décision #6 = A) : PLATS, sans « / ». Compatibles route simple
 *   /dossiers/:id/phases/:phaseSlug et utilisables comme clé stable.
 *
 * Convention : fichier versionné (git), modifiable sans migration DB.
 * Alimente UNE SEULE page React générique via buildPhaseIndex().
 * ============================================================================
 */
export type Acteur = 'CLIENT' | 'ARCHITECTE' | 'BET_STRUCTURE' | 'BET_FLUIDES' | 'BET_VRD' | 'TOPOGRAPHE' | 'GEOTECHNICIEN' | 'LABORATOIRE' | 'BUREAU_CONTROLE' | 'BUREAU_CONTROLE_ASCENSEUR' | 'ASCENSORISTE' | 'ENTREPRISE_GO' | 'ENTREPRISE_LOT' | 'FOURNISSEUR' | 'CONCESSIONNAIRE' | 'ADMINISTRATION' | 'CITURBAREA_OPS' | 'ADMIN' | 'CNOA' | 'CONSERVATION_FONCIERE' | 'OPC' | 'COORDONNATEUR_SPS';
export type PhaseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'WAITING_ARCHITECT' | 'WAITING_BET' | 'WAITING_CONTROL' | 'WAITING_ADMINISTRATION' | 'WAITING_COMPANY' | 'WAITING_PAYMENT' | 'BLOCKED' | 'UNDER_REVIEW' | 'VALIDATED' | 'ARCHIVED' | 'CANCELLED';
export type PhaseFamille = 'CADRAGE' | 'CONCEPTION' | 'AUTORISATION' | 'EXECUTION_ETUDES' | 'CPS_MARCHES' | 'CHANTIER_GO' | 'CHANTIER_SECOND_OEUVRE' | 'RECEPTION';
export type MarketplaceMode = 'STRICT' | 'PRIORITAIRE' | 'AUCUN';
export type Cercle = 'CERCLE_CONCEPTION' | 'CERCLE_FONCIER' | 'CERCLE_AUTORISATION' | 'CERCLE_APPEL_OFFRES' | 'CERCLE_GROS_OEUVRE' | 'CERCLE_SECOND_OEUVRE' | 'CERCLE_RECEPTION' | null;
export type MarketplaceCategorie = 'ARCHITECTE' | 'BET_STRUCTURE' | 'BET_FLUIDES' | 'BET_VRD' | 'TOPOGRAPHE' | 'GEOTECHNICIEN' | 'LABORATOIRE' | 'BUREAU_CONTROLE' | 'BUREAU_CONTROLE_ASCENSEUR' | 'ASCENSORISTE' | 'ENTREPRISE_GO' | 'ENTREPRISE_TCE' | 'ENTREPRISE_LOT' | 'ENTREPRISE_VRD' | 'ASSISTANCE_ADMIN' | 'SUIVI_CONCESSIONNAIRE' | 'MAT_BETON' | 'MAT_ACIER' | 'MAT_COFFRAGE' | 'MAT_ETANCHEITE' | 'MAT_DRAINAGE' | 'MAT_REMBLAI' | 'MAT_MACONNERIE' | 'MAT_ISOLATION' | 'MAT_PLOMBERIE' | 'MAT_ELECTRICITE' | 'MAT_CVC' | 'MAT_ASCENSEUR' | 'MAT_MENUISERIE_BOIS' | 'MAT_MENUISERIE_ALU' | 'MAT_CARRELAGE' | 'MAT_SANITAIRE' | 'MAT_PEINTURE' | 'MAT_VITRERIE' | 'MAT_FAUX_PLAFOND' | 'MAT_REVETEMENT_SOL' | 'MAT_AMENAGEMENT_EXT' | 'MAT_SECURITE_INCENDIE';
export type GenerationKind = 'FIXE' | 'DYNAMIQUE_SOUS_SOL' | 'DYNAMIQUE_PLANCHER' | 'DYNAMIQUE_LOT';
export interface DocumentAttendu {
    nature: string;
    formats: string[];
    obligatoire?: boolean;
    /** Document requis seulement si un flag dossier est actif (ex. 'securiteIncendie'). */
    conditionFlag?: keyof DossierFlags;
    /** Document requis seulement pour une porte donnée (ex. 'P2' pour RC/ICE). */
    conditionPorte?: 'P1' | 'P2';
    /** Document requis seulement pour certaines opérations foncières. */
    conditionFoncier?: TypeOperationFoncier[];
}
export interface MarketplaceBranchement {
    mode: MarketplaceMode;
    cercle: Cercle;
    categories: MarketplaceCategorie[];
    commandeMateriaux: boolean;
    commandeService: boolean;
    suiviRetour: boolean;
}
export interface PhaseDef {
    code: string;
    slug: string;
    title: string;
    famille: PhaseFamille;
    order: number;
    /** Toujours une obligation de MOYENS — jamais promettre un résultat tiers. */
    objectif: string;
    acteurs: Acteur[];
    validateurs: Acteur[];
    prerequis: string[];
    documentsAttendus: DocumentAttendu[];
    pv: string[];
    generation: GenerationKind;
    marketplace: MarketplaceBranchement;
    paiementMilestone: boolean;
    /** Phase présente uniquement si ce flag dossier est actif. undefined = toujours. */
    conditionFlag?: keyof DossierFlags;
    /** Phase présente uniquement pour certaines opérations foncières. undefined = toujours. */
    conditionFoncier?: TypeOperationFoncier[];
}
/** Typologie de l'opération foncière (loi 25-90). 'aucun' = construction sur terrain déjà titré. */
export type TypeOperationFoncier = 'lotissement' | 'groupeHabitation' | 'morcellement' | 'aucun';
/** Drapeaux conditionnels d'un dossier — activent les branches marocaines. */
export interface DossierFlags {
    securiteIncendie: boolean;
    ascenseur: boolean;
    financementBancaire: boolean;
    raccordementsDefinitifs: boolean;
    terrainNonBorne: boolean;
    chantierComplexe: boolean;
    demolitionExistant: boolean;
}
export declare const PHASES_FIXES: PhaseDef[];
export declare const TEMPLATE_SOUS_SOL: Omit<PhaseDef, 'code' | 'slug' | 'title' | 'order' | 'prerequis'>;
export declare const TEMPLATE_PLANCHER: Omit<PhaseDef, 'code' | 'slug' | 'title' | 'order' | 'prerequis'>;
/** Vague d'un lot : RESEAUX = encastré (avant tests), FINITION = fermeture (après tests). */
export type LotVague = 'RESEAUX' | 'FINITION' | 'INDEPENDANT';
export interface LotDef {
    code: string;
    slug: string;
    title: string;
    categorieMateriau: MarketplaceCategorie;
    vague: LotVague;
    pv: string[];
    validateursSup?: Acteur[];
    pvSupport?: string[];
}
/**
 * LOTS DE SECOND ŒUVRE — vagues :
 *   RESEAUX (encastrés) → 91_TESTS_RESEAUX → FINITION (fermeture).
 *   Les lots de fermeture (faux plafond, carrelage, peinture, sol) dépendent
 *   des tests réseaux pour interdire de fermer avant test.
 */
export declare const LOTS_SECOND_OEUVRE: LotDef[];
export interface DossierShape {
    /** Identifiant de dossier — appartient à la route/backend, non utilisé par la
     *  logique de génération. Le backend valide qu'il s'agit d'une chaîne non vide
     *  AVANT d'instancier ce shape ; le catalogue ne s'en sert pas. */
    id: string;
    porte: 'P1' | 'P2';
    /**
     * Nombre d'étages hors sol au sens « R+N » : 0 = RDC seul, 4 = R+4.
     * Le moteur génère les planchers porteurs = RDC + R1..RN + couverture/terrasse,
     * soit (nbEtagesHorsSol + 2) planchers GO hors sol. Évite l'ambiguïté R+4/R+3.
     */
    nbEtagesHorsSol: number;
    nbSousSols: number;
    flags: DossierFlags;
    /** Typologie de l'opération foncière (loi 25-90). 'aucun' = terrain déjà titré. */
    typeOperationFoncier: TypeOperationFoncier;
    /** undefined = TOUS les lots ; tableau non vide = sélection ; VIDE = interdit. */
    lotsApplicables?: string[];
}
export interface PhaseIndex {
    bySlug: Record<string, PhaseDef>;
    byCode: Record<string, PhaseDef>;
    ordered: PhaseDef[];
}
/**
 * Génération PUBLIQUE sûre : valide le dossier puis génère. Lève une erreur si
 * invalide. C'est la seule API de génération à utiliser depuis le backend/API.
 */
export declare function generatePhases(dossier: DossierShape): PhaseDef[];
/**
 * Construit l'index navigable. VALIDE d'abord le dossier et lève une erreur si
 * invalide (P0 : aucune génération sans validation préalable). Le service
 * backend doit AUSSI appeler validateDossier() en amont pour un message propre.
 */
export declare function buildPhaseIndex(dossier: DossierShape): PhaseIndex;
/** Bornes métier par porte (P0 audit-4 : éviter collisions order et abus). */
export declare const BORNES: {
    readonly P1: {
        readonly maxEtagesHorsSol: 4;
        readonly maxSousSols: 2;
    };
    readonly P2: {
        readonly maxEtagesHorsSol: 10;
        readonly maxSousSols: 5;
    };
};
/**
 * Audit complet. Deux étages :
 *  1. Validation runtime DÉFENSIVE des entrées (le JSON d'API n'est pas typé) —
 *     court-circuite AVANT toute génération si une primitive est invalide.
 *  2. Audit structurel (collisions, prérequis, DAG, orphelines) sur le graphe généré.
 */
export declare function validateDossier(dossier: DossierShape): {
    ok: boolean;
    errors: string[];
};
