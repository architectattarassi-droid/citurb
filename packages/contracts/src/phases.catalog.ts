/* eslint-disable max-len */
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

// ─────────────────────────────────────────────────────────────────────────
// ENUMS & TYPES
// ─────────────────────────────────────────────────────────────────────────

export type Acteur =
  | 'CLIENT'
  | 'ARCHITECTE'
  | 'BET_STRUCTURE'
  | 'BET_FLUIDES'
  | 'BET_VRD'
  | 'TOPOGRAPHE'
  | 'GEOTECHNICIEN'
  | 'LABORATOIRE'
  | 'BUREAU_CONTROLE'
  | 'BUREAU_CONTROLE_ASCENSEUR'
  | 'ASCENSORISTE'
  | 'ENTREPRISE_GO'
  | 'ENTREPRISE_LOT'
  | 'FOURNISSEUR'
  | 'CONCESSIONNAIRE'      // eau / élec / assainissement / télécom
  | 'ADMINISTRATION'       // Rokhas / CRI Invest / commune / protection civile
  | 'CITURBAREA_OPS'       // pilotage MOD interne (validateur de complétude, jamais technique)
  | 'ADMIN'
  // Vague A — acteurs dédiés (décisions Yassine)
  | 'CNOA'                  // Conseil National de l'Ordre des Architectes (visa pré-Rokhas)
  | 'CONSERVATION_FONCIERE' // Conservation Foncière (immatriculation, titres)
  | 'OPC'                   // Coordonnateur Ordonnancement Pilotage Coordination
  | 'COORDONNATEUR_SPS';    // Coordonnateur Sécurité Protection Santé chantier

export type PhaseStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_ARCHITECT'
  | 'WAITING_BET'
  | 'WAITING_CONTROL'
  | 'WAITING_ADMINISTRATION'
  | 'WAITING_COMPANY'
  | 'WAITING_PAYMENT'
  | 'BLOCKED'
  | 'UNDER_REVIEW'
  | 'VALIDATED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type PhaseFamille =
  | 'CADRAGE'
  | 'CONCEPTION'
  | 'AUTORISATION'
  | 'EXECUTION_ETUDES'
  | 'CPS_MARCHES'
  | 'CHANTIER_GO'
  | 'CHANTIER_SECOND_OEUVRE'
  | 'RECEPTION';

export type MarketplaceMode = 'STRICT' | 'PRIORITAIRE' | 'AUCUN';

export type Cercle =
  | 'CERCLE_CONCEPTION'
  | 'CERCLE_FONCIER'
  | 'CERCLE_AUTORISATION'
  | 'CERCLE_APPEL_OFFRES'
  | 'CERCLE_GROS_OEUVRE'
  | 'CERCLE_SECOND_OEUVRE'
  | 'CERCLE_RECEPTION'
  | null;

export type MarketplaceCategorie =
  // Prestataires / services
  | 'ARCHITECTE'
  | 'BET_STRUCTURE'
  | 'BET_FLUIDES'
  | 'BET_VRD'
  | 'TOPOGRAPHE'
  | 'GEOTECHNICIEN'
  | 'LABORATOIRE'
  | 'BUREAU_CONTROLE'
  | 'BUREAU_CONTROLE_ASCENSEUR'
  | 'ASCENSORISTE'
  | 'ENTREPRISE_GO'
  | 'ENTREPRISE_TCE'
  | 'ENTREPRISE_LOT'
  | 'ENTREPRISE_VRD'
  | 'ASSISTANCE_ADMIN'
  | 'SUIVI_CONCESSIONNAIRE'
  // Matériaux
  | 'MAT_BETON'
  | 'MAT_ACIER'
  | 'MAT_COFFRAGE'
  | 'MAT_ETANCHEITE'
  | 'MAT_DRAINAGE'
  | 'MAT_REMBLAI'
  | 'MAT_MACONNERIE'
  | 'MAT_ISOLATION'
  | 'MAT_PLOMBERIE'
  | 'MAT_ELECTRICITE'
  | 'MAT_CVC'
  | 'MAT_ASCENSEUR'
  | 'MAT_MENUISERIE_BOIS'
  | 'MAT_MENUISERIE_ALU'
  | 'MAT_CARRELAGE'
  | 'MAT_SANITAIRE'
  | 'MAT_PEINTURE'
  | 'MAT_VITRERIE'
  | 'MAT_FAUX_PLAFOND'
  | 'MAT_REVETEMENT_SOL'
  | 'MAT_AMENAGEMENT_EXT'
  | 'MAT_SECURITE_INCENDIE';

export type GenerationKind =
  | 'FIXE'
  | 'DYNAMIQUE_SOUS_SOL'
  | 'DYNAMIQUE_PLANCHER'
  | 'DYNAMIQUE_LOT';

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
  slug: string;            // PLAT, sans « / »
  title: string;
  famille: PhaseFamille;
  order: number;
  /** Toujours une obligation de MOYENS — jamais promettre un résultat tiers. */
  objectif: string;
  acteurs: Acteur[];
  validateurs: Acteur[];
  prerequis: string[];     // codes de phases bloquantes
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
  securiteIncendie: boolean;     // ERP / IGH / collectif sensible : dossier + avis + lot + conformité
  ascenseur: boolean;            // lot électromécanique spécialisé + conformité propre
  financementBancaire: boolean;  // branche financement : dossier + accord + déblocage initial bloquant
  raccordementsDefinitifs: boolean; // branchements définitifs concessionnaires avant permis d'habiter
  // Vague A — flags ajoutés pour enrichissement catalogue
  terrainNonBorne: boolean;      // terrain individuel non encore borné/immatriculé → phase 08
  chantierComplexe: boolean;     // déclenche OPC + mission SPS — TODO Yassine: seuils RGC exacts ?
  demolitionExistant: boolean;   // construction existante à démolir → phase 27 permis démolir
}
// NOTE doctrine v4+ : le bureau de contrôle (CTC) est OBLIGATOIRE pour tout
// dossier chantier (positionnement premium qualité). Pas de flag : les phases
// 18_MANDAT_BUREAU_CONTROLE et 42_VISA_STRUCTURE_CONTROLE sont FIXES.
//
// La branche foncière est pilotée par DossierShape.typeOperationFoncier :
//   'aucun'           → pas de branche lotissement
//   'morcellement'    → dépôt + autorisation + bornage/titres (sans équipement VRD)
//   'groupeHabitation'→ dépôt + autorisation + équipement + réception + bornage
//   'lotissement'     → cycle complet identique à groupeHabitation

const NO_MARKET: MarketplaceBranchement = {
  mode: 'AUCUN', cercle: null, categories: [],
  commandeMateriaux: false, commandeService: false, suiviRetour: false,
};

// ─────────────────────────────────────────────────────────────────────────
// PHASES FIXES — du cadrage à la réception définitive
// ─────────────────────────────────────────────────────────────────────────

export const PHASES_FIXES: PhaseDef[] = [
  // ════════════════ A. CADRAGE ════════════════
  {
    code: '00_BRIEF', slug: 'brief', title: 'Brief & cadrage du projet', famille: 'CADRAGE', order: 0,
    objectif: "Recueillir le besoin, le profil du maître d'ouvrage et les contraintes du terrain.",
    acteurs: ['CLIENT', 'CITURBAREA_OPS'], validateurs: ['CITURBAREA_OPS'], prerequis: [],
    documentsAttendus: [
      { nature: 'Pièce identité (CIN ou RC/ICE)', formats: ['PDF', 'JPEG', 'PNG'], obligatoire: true },
      { nature: 'Titre foncier / réquisition', formats: ['PDF'], obligatoire: true },
      { nature: 'RC + ICE société', formats: ['PDF'], obligatoire: true, conditionPorte: 'P2' },
      { nature: 'Statuts + pouvoir du signataire', formats: ['PDF'], obligatoire: true, conditionPorte: 'P2' },
      { nature: 'Modèle J / attestation fiscale', formats: ['PDF'], conditionPorte: 'P2' },
    ],
    pv: [], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '01_FAISABILITE_URBANISTIQUE', slug: 'faisabilite-urbanistique', title: 'Faisabilité urbanistique', famille: 'CADRAGE', order: 100,
    objectif: "Vérifier la constructibilité, le zonage et les contraintes du document d'urbanisme applicable (loi 12-90).",
    acteurs: ['ARCHITECTE', 'CLIENT', 'ADMINISTRATION', 'CITURBAREA_OPS'], validateurs: ['ARCHITECTE'], prerequis: ['00_BRIEF'],
    documentsAttendus: [{ nature: 'Note de renseignement / certificat urbanisme', formats: ['PDF'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_AUTORISATION', categories: ['ASSISTANCE_ADMIN', 'ARCHITECTE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '02_RELEVE_TOPO_FONCIER', slug: 'releve-topo-foncier', title: 'Relevé topographique & foncier', famille: 'CADRAGE', order: 200,
    objectif: "Établir le levé topographique et clarifier la situation foncière du terrain.",
    acteurs: ['TOPOGRAPHE', 'CLIENT'], validateurs: ['TOPOGRAPHE'], prerequis: ['01_FAISABILITE_URBANISTIQUE'],
    documentsAttendus: [{ nature: 'Plan de bornage / levé', formats: ['PDF', 'DWG'] }],
    pv: ['PV_BORNAGE'], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_FONCIER', categories: ['TOPOGRAPHE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  // ── Vague A C10+C2 fusionnées — BORNAGE & IMMATRICULATION (conditionnel) ──
  {
    code: '08_BORNAGE_IMMATRICULATION', slug: 'bornage-immatriculation', title: 'Bornage & immatriculation foncière', famille: 'CADRAGE', order: 300,
    objectif: "Constituer le bornage et le dossier d'immatriculation à la Conservation Foncière.", // TODO Yassine: formulation + clarifier scope "Dossier enregistrement"
    acteurs: ['TOPOGRAPHE', 'CONSERVATION_FONCIERE'],
    validateurs: ['TOPOGRAPHE'], // Yassine: le topographe valide le bornage ; la Conservation Foncière est destinataire du dossier
    prerequis: ['02_RELEVE_TOPO_FONCIER'],
    documentsAttendus: [{ nature: 'Plan de bornage + réquisition immatriculation', formats: ['PDF', 'DWG'] }],
    pv: ['PV_BORNAGE'], generation: 'FIXE', conditionFlag: 'terrainNonBorne',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_FONCIER', categories: ['TOPOGRAPHE', 'ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '04_ETUDE_GEOTECHNIQUE', slug: 'etude-geotechnique', title: 'Étude géotechnique', famille: 'CADRAGE', order: 400,
    objectif: "Caractériser le sol pour le dimensionnement des fondations (sondages, essais).",
    acteurs: ['GEOTECHNICIEN', 'LABORATOIRE', 'CLIENT'], validateurs: ['GEOTECHNICIEN'], prerequis: ['02_RELEVE_TOPO_FONCIER'],
    documentsAttendus: [{ nature: 'Rapport géotechnique', formats: ['PDF'] }],
    pv: ['PV_SONDAGE'], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_FONCIER', categories: ['GEOTECHNICIEN', 'LABORATOIRE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },

  // ════════════════ B. CONCEPTION ════════════════
  {
    code: '10_ESQUISSE', slug: 'esquisse', title: 'Esquisse (ESQ)', famille: 'CONCEPTION', order: 1000,
    objectif: "Produire les premières propositions architecturales pour validation du parti.",
    acteurs: ['ARCHITECTE', 'CLIENT'], validateurs: ['CLIENT'], prerequis: ['04_ETUDE_GEOTECHNIQUE'],
    documentsAttendus: [{ nature: 'Planches esquisse', formats: ['PDF'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['ARCHITECTE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: true,
  },
  {
    code: '12_APS', slug: 'aps', title: 'Avant-projet sommaire (APS)', famille: 'CONCEPTION', order: 1200,
    objectif: "Arrêter les surfaces, volumes et grands principes constructifs.",
    acteurs: ['ARCHITECTE', 'CLIENT'], validateurs: ['CLIENT'], prerequis: ['10_ESQUISSE'],
    documentsAttendus: [{ nature: 'Dossier APS', formats: ['PDF', 'DWG'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['ARCHITECTE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '14_APD', slug: 'apd', title: 'Avant-projet détaillé (APD)', famille: 'CONCEPTION', order: 1400,
    objectif: "Détailler le projet architectural et engager les études techniques.",
    acteurs: ['ARCHITECTE', 'BET_STRUCTURE', 'BET_FLUIDES', 'CLIENT'], validateurs: ['CLIENT', 'ARCHITECTE'], prerequis: ['12_APS'],
    documentsAttendus: [
      { nature: 'Plans architecte APD', formats: ['PDF', 'DWG'] },
      { nature: 'Note de calcul préliminaire structure', formats: ['PDF'] },
    ],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['ARCHITECTE', 'BET_STRUCTURE', 'BET_FLUIDES'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: true,
  },
  {
    code: '15_MANDAT_BET', slug: 'mandat-bet', title: 'Mandat bureaux d\'études', famille: 'CONCEPTION', order: 1500,
    objectif: "Mandater les BET structure / fluides / VRD nécessaires au projet.",
    acteurs: ['CLIENT', 'BET_STRUCTURE', 'BET_FLUIDES', 'BET_VRD', 'CITURBAREA_OPS'], validateurs: ['CLIENT'], prerequis: ['14_APD'],
    documentsAttendus: [{ nature: 'Contrats / mandats BET signés', formats: ['PDF'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['BET_STRUCTURE', 'BET_FLUIDES', 'BET_VRD'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '17_DOSSIER_FINANCEMENT', slug: 'dossier-financement', title: 'Dossier de financement bancaire', famille: 'CONCEPTION', order: 1700,
    objectif: "Monter le dossier de financement (plan de financement, garanties, pièces) pour la banque.",
    acteurs: ['CLIENT', 'CITURBAREA_OPS'], validateurs: ['CITURBAREA_OPS'], prerequis: ['14_APD'],
    documentsAttendus: [{ nature: 'Dossier de financement', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'financementBancaire',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_AUTORISATION', categories: ['ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '18_MANDAT_BUREAU_CONTROLE', slug: 'mandat-bureau-controle', title: 'Mandat bureau de contrôle (CTC)', famille: 'CONCEPTION', order: 1800,
    objectif: "Mandater le bureau de contrôle technique pour le visa structure et le suivi (RPS 2000 v2011).",
    acteurs: ['CLIENT', 'BUREAU_CONTROLE', 'ARCHITECTE'], validateurs: ['CLIENT'], prerequis: ['15_MANDAT_BET'],
    documentsAttendus: [{ nature: 'Mandat bureau de contrôle signé', formats: ['PDF'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['BUREAU_CONTROLE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '19_ACCORD_FINANCEMENT', slug: 'accord-financement', title: 'Accord de financement', famille: 'CONCEPTION', order: 1900,
    objectif: "Constater l'accord de financement et les conditions de déblocage (décision de la banque).",
    acteurs: ['CLIENT', 'CITURBAREA_OPS'], validateurs: ['CLIENT'], prerequis: ['17_DOSSIER_FINANCEMENT'],
    documentsAttendus: [{ nature: 'Offre / accord de prêt', formats: ['PDF'], obligatoire: true }],
    pv: [], generation: 'FIXE', conditionFlag: 'financementBancaire',
    marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '22_DOSSIER_SECURITE_INCENDIE', slug: 'dossier-securite-incendie', title: 'Dossier sécurité incendie', famille: 'CONCEPTION', order: 2200,
    objectif: "Constituer le dossier de sécurité incendie pour avis de la protection civile (ERP / IGH / collectif sensible).",
    acteurs: ['ARCHITECTE', 'BET_FLUIDES', 'BUREAU_CONTROLE', 'ADMINISTRATION'], validateurs: ['ARCHITECTE'], prerequis: ['18_MANDAT_BUREAU_CONTROLE'],
    documentsAttendus: [{ nature: 'Dossier sécurité incendie', formats: ['PDF', 'DWG'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'securiteIncendie',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['BET_FLUIDES', 'BUREAU_CONTROLE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '24_AVIS_PROTECTION_CIVILE', slug: 'avis-protection-civile', title: 'Avis de la protection civile', famille: 'AUTORISATION', order: 2400,
    objectif: "Suivre et archiver l'avis de la protection civile sur le dossier sécurité incendie (décision administrative).",
    acteurs: ['ADMINISTRATION', 'ARCHITECTE', 'BET_FLUIDES'], validateurs: ['ADMINISTRATION'], prerequis: ['22_DOSSIER_SECURITE_INCENDIE'],
    documentsAttendus: [{ nature: 'Avis protection civile', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'securiteIncendie',
    marketplace: NO_MARKET, paiementMilestone: false,
  },

  // ════════════════ C. AUTORISATION ════════════════
  {
    code: '28_DOSSIER_LOTISSEMENT', slug: 'dossier-lotissement', title: 'Dossier de lotissement', famille: 'AUTORISATION', order: 2800,
    objectif: "Constituer et déposer le dossier de lotissement / groupe d'habitations / morcellement (loi 25-90).",
    acteurs: ['ARCHITECTE', 'BET_VRD', 'CLIENT'], validateurs: ['ARCHITECTE'], prerequis: ['15_MANDAT_BET'],
    documentsAttendus: [{ nature: 'Dossier lotissement (plans VRD + règlement)', formats: ['PDF', 'DWG'] }],
    pv: ['PV_DEPOT_LOTISSEMENT'], generation: 'FIXE', conditionFoncier: ['lotissement', 'groupeHabitation', 'morcellement'],
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_AUTORISATION', categories: ['BET_VRD', 'ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: true,
  },
  {
    code: '29_AUTORISATION_LOTIR', slug: 'autorisation-lotir', title: 'Autorisation de lotir', famille: 'AUTORISATION', order: 2900,
    objectif: "Suivre et archiver la décision administrative d'autorisation de lotir (la décision appartient à l'autorité).",
    acteurs: ['ADMINISTRATION', 'ARCHITECTE', 'CLIENT'], validateurs: ['ADMINISTRATION'], prerequis: ['28_DOSSIER_LOTISSEMENT'],
    documentsAttendus: [{ nature: 'Arrêté d\'autorisation de lotir', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFoncier: ['lotissement', 'groupeHabitation', 'morcellement'],
    marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '29B_TRAVAUX_EQUIPEMENT_LOTISSEMENT', slug: 'travaux-equipement-lotissement', title: 'Travaux d\'équipement du lotissement (VRD)', famille: 'CHANTIER_GO', order: 2920,
    objectif: "Réaliser les travaux d'équipement du lotissement : voirie, réseaux, assainissement (loi 25-90).",
    acteurs: ['BET_VRD', 'ENTREPRISE_GO', 'ARCHITECTE', 'CLIENT'], validateurs: ['BET_VRD', 'ARCHITECTE'], prerequis: ['29_AUTORISATION_LOTIR'],
    documentsAttendus: [{ nature: 'Plans VRD + PV travaux', formats: ['PDF', 'DWG'] }],
    pv: ['PV_TRAVAUX_VRD'], generation: 'FIXE', conditionFoncier: ['lotissement', 'groupeHabitation'],
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['BET_VRD', 'ENTREPRISE_VRD', 'MAT_DRAINAGE', 'MAT_REMBLAI'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
    paiementMilestone: true,
  },
  {
    code: '29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT', slug: 'reception-equipements-lotissement', title: 'Réception des équipements du lotissement', famille: 'RECEPTION', order: 2940,
    objectif: "Faire réceptionner les équipements du lotissement par l'administration et les concessionnaires.",
    acteurs: ['ADMINISTRATION', 'BET_VRD', 'ARCHITECTE', 'CLIENT'], validateurs: ['ADMINISTRATION'], prerequis: ['29B_TRAVAUX_EQUIPEMENT_LOTISSEMENT'],
    documentsAttendus: [{ nature: 'PV réception équipements', formats: ['PDF'] }],
    pv: ['PV_RECEPTION_EQUIPEMENTS'], generation: 'FIXE', conditionFoncier: ['lotissement', 'groupeHabitation'],
    marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '29D_BORNAGE_TITRES', slug: 'bornage-titres-individuels', title: 'Bornage & titres individuels', famille: 'AUTORISATION', order: 2960,
    objectif: "Constituer le dossier de bornage et de morcellement pour titres individuels auprès de la conservation foncière.",
    acteurs: ['TOPOGRAPHE', 'ADMINISTRATION', 'CLIENT'], validateurs: ['TOPOGRAPHE'], prerequis: ['29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT'],
    documentsAttendus: [{ nature: 'Plans de bornage + réquisitions individuelles', formats: ['PDF', 'DWG'] }],
    pv: ['PV_BORNAGE_INDIVIDUEL'], generation: 'FIXE', conditionFoncier: ['lotissement', 'groupeHabitation', 'morcellement'],
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_FONCIER', categories: ['TOPOGRAPHE', 'ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  // ── Vague A C9 — PERMIS_DEMOLIR (conditionnel) ──
  {
    code: '27_PERMIS_DEMOLIR', slug: 'permis-demolir', title: 'Permis de démolir', famille: 'AUTORISATION', order: 2700,
    objectif: "Constituer et déposer la demande de permis de démolir la construction existante.", // TODO Yassine: formulation + acteurs
    acteurs: ['ARCHITECTE', 'ADMINISTRATION', 'CLIENT'],
    validateurs: ['ADMINISTRATION'],
    prerequis: ['15_MANDAT_BET'], // TODO Yassine: bon prérequis ? (architecture pré-démolition vs post)
    documentsAttendus: [{ nature: 'Dossier permis de démolir', formats: ['PDF', 'DWG'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'demolitionExistant',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_AUTORISATION', categories: ['ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '30_DOSSIER_AUTORISATION', slug: 'dossier-autorisation', title: 'Dossier d\'autorisation de construire (Rokhas / CRI)', famille: 'AUTORISATION', order: 3000,
    objectif: "Constituer et déposer le dossier de demande d'autorisation de construire (obligation de moyens — la décision appartient à l'administration).",
    acteurs: ['ARCHITECTE', 'CLIENT', 'ADMINISTRATION', 'CITURBAREA_OPS'], validateurs: ['ARCHITECTE'], prerequis: ['15_MANDAT_BET'],
    documentsAttendus: [
      { nature: 'Dossier Rokhas complet (plans + formulaires)', formats: ['PDF', 'DWG'], obligatoire: true },
      { nature: 'Reçu de dépôt Rokhas', formats: ['PDF'] },
    ],
    pv: ['PV_DEPOT_AUTORISATION'], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_AUTORISATION', categories: ['ASSISTANCE_ADMIN', 'ARCHITECTE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: true,
  },
  // ── Vague A C8 — VISA_CNOA (fixe, confirmé requis 2026) ──
  {
    code: '32_VISA_CNOA', slug: 'visa-cnoa', title: 'Visa du dossier par le CNOA', famille: 'AUTORISATION', order: 3200,
    objectif: "Suivre et archiver le visa du dossier d'autorisation par le Conseil National de l'Ordre des Architectes.", // TODO Yassine: confirmer formulation
    acteurs: ['ARCHITECTE', 'CNOA'],
    validateurs: ['CNOA'],
    prerequis: ['30_DOSSIER_AUTORISATION'],
    documentsAttendus: [{ nature: 'Visa CNOA', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '34_PERMIS_CONSTRUIRE', slug: 'permis-construire', title: 'Décision relative au permis de construire', famille: 'AUTORISATION', order: 3400,
    objectif: "Suivre et archiver la décision administrative relative au permis de construire (la décision appartient à l'autorité compétente).",
    // Vague A : prereq mis à jour pour consommer le visa CNOA 32 (qui dépend lui-même de 30).
    acteurs: ['ADMINISTRATION', 'ARCHITECTE', 'CLIENT'], validateurs: ['ADMINISTRATION'], prerequis: ['32_VISA_CNOA'],
    documentsAttendus: [{ nature: 'Permis de construire', formats: ['PDF'], obligatoire: true }],
    pv: [], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '36_AFFICHAGE_RECOURS', slug: 'affichage-recours', title: 'Affichage & délai de recours', famille: 'AUTORISATION', order: 3600,
    objectif: "Constater l'affichage réglementaire du permis et la purge du délai de recours.",
    acteurs: ['CLIENT', 'ARCHITECTE', 'ADMINISTRATION'], validateurs: ['ARCHITECTE'], prerequis: ['34_PERMIS_CONSTRUIRE'],
    documentsAttendus: [{ nature: 'PV affichage / constat huissier', formats: ['PDF'] }],
    pv: ['PV_AFFICHAGE'], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },

  // ════════════════ D. ÉTUDES D'EXÉCUTION ════════════════
  {
    code: '40_DOSSIER_EXECUTION', slug: 'dossier-execution', title: 'Dossier d\'exécution (DEXE)', famille: 'EXECUTION_ETUDES', order: 4000,
    objectif: "Produire les plans et notes d'exécution structure et fluides.",
    acteurs: ['BET_STRUCTURE', 'BET_FLUIDES', 'ARCHITECTE'], validateurs: ['BET_STRUCTURE', 'ARCHITECTE'], prerequis: ['36_AFFICHAGE_RECOURS'],
    documentsAttendus: [
      { nature: 'Plans d\'exécution BA', formats: ['PDF', 'DWG'] },
      { nature: 'Notes de calcul', formats: ['PDF'] },
      { nature: 'Plans fluides (plomberie, élec, CVC)', formats: ['PDF', 'DWG'] },
    ],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['BET_STRUCTURE', 'BET_FLUIDES'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '42_VISA_STRUCTURE_CONTROLE', slug: 'visa-structure-controle', title: 'Visa structure du bureau de contrôle', famille: 'EXECUTION_ETUDES', order: 4200,
    objectif: "Suivre et faire constituer le visa du bureau de contrôle sur les notes de calcul et plans d'exécution (RPS 2000 v2011).",
    acteurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE', 'ARCHITECTE'], validateurs: ['BUREAU_CONTROLE'], prerequis: ['40_DOSSIER_EXECUTION', '18_MANDAT_BUREAU_CONTROLE'],
    documentsAttendus: [{ nature: 'Rapport de visa structure', formats: ['PDF'] }],
    pv: ['PV_VISA_STRUCTURE'], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_CONCEPTION', categories: ['BUREAU_CONTROLE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },

  // ── Vague A C5 — METRE_QUANTITATIF (fixe) ──
  {
    code: '48_METRE_QUANTITATIF', slug: 'metre-quantitatif', title: 'Métré et vérification des quantités', famille: 'CPS_MARCHES', order: 4800,
    objectif: "Établir le métré quantitatif détaillé avant consultation des entreprises.", // TODO Yassine: confirmer formulation
    acteurs: ['ARCHITECTE', 'BET_STRUCTURE'], // TODO Yassine: ajouter économiste/métreur ?
    validateurs: ['ARCHITECTE'], // TODO Yassine: confirmer
    prerequis: ['42_VISA_STRUCTURE_CONTROLE'],
    documentsAttendus: [{ nature: 'Métré quantitatif détaillé', formats: ['PDF', 'XLSX'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_APPEL_OFFRES', categories: ['ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: false }, // TODO Yassine: catégorie métreur/économiste à créer ?
    paiementMilestone: false,
  },

  // ════════════════ E. CPS & MARCHÉS ════════════════
  {
    code: '50_DCE', slug: 'dce', title: 'Dossier de consultation des entreprises (DCE)', famille: 'CPS_MARCHES', order: 5000,
    objectif: "Préparer CPS, descriptif et cadre de devis pour consultation des entreprises.",
    // Vague A : prereq mis à jour pour consommer le métré 48 (qui dépend lui-même de 42).
    // La règle dynamique audit-3 sur 42 reste appliquée si nécessaire.
    acteurs: ['ARCHITECTE', 'BET_STRUCTURE', 'CLIENT'], validateurs: ['ARCHITECTE'], prerequis: ['48_METRE_QUANTITATIF'],
    documentsAttendus: [{ nature: 'CPS + descriptif quantitatif', formats: ['PDF', 'XLSX'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_APPEL_OFFRES', categories: ['ENTREPRISE_GO', 'ENTREPRISE_TCE'], commandeMateriaux: false, commandeService: true, suiviRetour: false },
    paiementMilestone: false,
  },
  {
    code: '54_ATTRIBUTION_MARCHE', slug: 'attribution-marche', title: 'Attribution du marché travaux', famille: 'CPS_MARCHES', order: 5400,
    objectif: "Comparer les offres, sélectionner l'entreprise et mandater via escrow.",
    acteurs: ['CLIENT', 'ARCHITECTE', 'ENTREPRISE_GO', 'CITURBAREA_OPS'], validateurs: ['CLIENT'], prerequis: ['50_DCE'],
    documentsAttendus: [{ nature: 'Marché / mandat entreprise signé', formats: ['PDF'] }],
    pv: [], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_APPEL_OFFRES', categories: ['ENTREPRISE_GO', 'ENTREPRISE_TCE', 'ENTREPRISE_LOT'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: true,
  },
  // ── Vague A C6 — MANDAT_OPC (conditionnel chantierComplexe) ──
  {
    code: '55_MANDAT_OPC', slug: 'mandat-opc', title: 'Mandat OPC (Ordonnancement, Pilotage, Coordination)', famille: 'CPS_MARCHES', order: 5500,
    objectif: "Mandater le coordonnateur OPC du chantier.", // TODO Yassine: formulation + seuils déclencheurs précis
    acteurs: ['CLIENT', 'OPC', 'CITURBAREA_OPS'],
    validateurs: ['CLIENT'],
    prerequis: ['54_ATTRIBUTION_MARCHE'],
    documentsAttendus: [{ nature: 'Contrat OPC signé', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'chantierComplexe',
    // TODO Yassine: créer une MarketplaceCategorie OPC dédiée ou garder ASSISTANCE_ADMIN générique ?
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_APPEL_OFFRES', categories: ['ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '56_ASSURANCES_CAUTIONNEMENTS', slug: 'assurances-cautionnements', title: 'Assurances & cautionnements', famille: 'CPS_MARCHES', order: 5600,
    objectif: "Réunir assurances chantier (TRC, décennale) et cautionnements avant démarrage.",
    acteurs: ['CLIENT', 'ENTREPRISE_GO', 'CITURBAREA_OPS'], validateurs: ['CITURBAREA_OPS'], prerequis: ['54_ATTRIBUTION_MARCHE'],
    documentsAttendus: [{ nature: 'Attestations assurance + cautionnements', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  // ── Vague A C7 — MISSION_SPS (conditionnel chantierComplexe) ──
  {
    code: '56B_MISSION_SPS', slug: 'mission-sps', title: 'Mission SPS (Sécurité Protection Santé)', famille: 'CPS_MARCHES', order: 5650,
    objectif: "Mandater le coordonnateur Sécurité Protection Santé du chantier.", // TODO Yassine: seuils RGC déclencheurs (effectif/durée/montant) ?
    acteurs: ['CLIENT', 'COORDONNATEUR_SPS', 'CITURBAREA_OPS'],
    validateurs: ['CLIENT'],
    prerequis: ['54_ATTRIBUTION_MARCHE'],
    documentsAttendus: [{ nature: 'Contrat coordonnateur SPS', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'chantierComplexe',
    // TODO Yassine: créer une MarketplaceCategorie COORDONNATEUR_SPS dédiée ou garder ASSISTANCE_ADMIN générique ?
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_APPEL_OFFRES', categories: ['ASSISTANCE_ADMIN'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '57_DEBLOCAGE_INITIAL', slug: 'deblocage-initial', title: 'Déblocage initial (financement)', famille: 'CPS_MARCHES', order: 5700,
    objectif: "Constituer et suivre la demande de déblocage initial de financement selon l'accord bancaire (les tranches suivantes sont gérées hors catalogue comme appels de fonds).",
    acteurs: ['CLIENT', 'ENTREPRISE_GO', 'CITURBAREA_OPS'], validateurs: ['CITURBAREA_OPS'], prerequis: ['56_ASSURANCES_CAUTIONNEMENTS', '19_ACCORD_FINANCEMENT'],
    documentsAttendus: [{ nature: 'Demande de déblocage + attestation avancement', formats: ['PDF'] }],
    pv: [], generation: 'FIXE', conditionFlag: 'financementBancaire',
    marketplace: NO_MARKET, paiementMilestone: true,
  },
  {
    code: '58_RACCORDEMENTS_PROVISOIRES', slug: 'raccordements-provisoires', title: 'Raccordements provisoires de chantier', famille: 'CPS_MARCHES', order: 5800,
    objectif: "Constituer et suivre les branchements provisoires eau / électricité de chantier auprès des concessionnaires.",
    acteurs: ['CLIENT', 'ENTREPRISE_GO', 'CONCESSIONNAIRE', 'ARCHITECTE'], validateurs: ['ENTREPRISE_GO'], prerequis: ['56_ASSURANCES_CAUTIONNEMENTS'],
    documentsAttendus: [{ nature: 'Contrats branchements provisoires', formats: ['PDF'] }],
    pv: ['PV_RACCORDEMENT_PROVISOIRE'], generation: 'FIXE',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['SUIVI_CONCESSIONNAIRE', 'ENTREPRISE_GO'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },

  // ════════════════ F. CHANTIER — GROS ŒUVRE ════════════════
  {
    code: '80_OUVERTURE_CHANTIER', slug: 'ouverture-chantier', title: 'Ouverture du chantier', famille: 'CHANTIER_GO', order: 8000,
    objectif: "Déclarer l'ouverture du chantier et implanter l'ouvrage.",
    acteurs: ['ENTREPRISE_GO', 'TOPOGRAPHE', 'ARCHITECTE', 'BUREAU_CONTROLE', 'CLIENT'], validateurs: ['ARCHITECTE', 'TOPOGRAPHE'], prerequis: ['58_RACCORDEMENTS_PROVISOIRES'],
    documentsAttendus: [
      { nature: 'PV implantation', formats: ['PDF'] },
      { nature: 'Déclaration ouverture chantier', formats: ['PDF'] },
    ],
    pv: ['PV_OUVERTURE_CHANTIER', 'PV_IMPLANTATION'], generation: 'FIXE',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['ENTREPRISE_GO', 'TOPOGRAPHE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '82_INSTALLATION_CHANTIER', slug: 'installation-chantier', title: 'Installation & sécurisation du chantier', famille: 'CHANTIER_GO', order: 8200,
    objectif: "Installer base-vie, clôtures, signalisation et dispositifs de sécurité du chantier.",
    acteurs: ['ENTREPRISE_GO', 'ARCHITECTE', 'CLIENT'], validateurs: ['ARCHITECTE'], prerequis: ['80_OUVERTURE_CHANTIER'],
    documentsAttendus: [{ nature: 'Plan installation chantier + photos', formats: ['PDF', 'JPEG', 'PNG'] }],
    pv: ['PV_INSTALLATION_CHANTIER'], generation: 'FIXE',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['ENTREPRISE_GO'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '83_TERRASSEMENT', slug: 'terrassement', title: 'Terrassement & fouilles', famille: 'CHANTIER_GO', order: 8300,
    objectif: "Réaliser les terrassements et fouilles selon les plans d'exécution.",
    acteurs: ['ENTREPRISE_GO', 'GEOTECHNICIEN', 'BUREAU_CONTROLE', 'ARCHITECTE'], validateurs: ['BUREAU_CONTROLE'], prerequis: ['82_INSTALLATION_CHANTIER'],
    documentsAttendus: [{ nature: 'Photos terrassement', formats: ['JPEG', 'PNG'] }],
    pv: ['PV_TERRASSEMENT'], generation: 'FIXE',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['ENTREPRISE_GO', 'MAT_REMBLAI', 'MAT_DRAINAGE'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '84_FONDATIONS', slug: 'fondations', title: 'Fondations', famille: 'CHANTIER_GO', order: 8400,
    objectif: "Réaliser les fondations (semelles / radier) avec contrôle béton et essais.",
    acteurs: ['ENTREPRISE_GO', 'BET_STRUCTURE', 'LABORATOIRE', 'BUREAU_CONTROLE', 'ARCHITECTE'], validateurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE'], prerequis: ['83_TERRASSEMENT'],
    documentsAttendus: [
      { nature: 'Bons béton + essais', formats: ['PDF'] },
      { nature: 'Photos fondations', formats: ['JPEG', 'PNG'] },
    ],
    pv: ['PV_FONDATIONS'], generation: 'FIXE',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE', categories: ['ENTREPRISE_GO', 'MAT_BETON', 'MAT_ACIER', 'MAT_COFFRAGE', 'MAT_DRAINAGE', 'LABORATOIRE'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
    paiementMilestone: true,
  },
  // ↓↓↓ Sous-sols (8500+) puis planchers (8600+) insérés dynamiquement ici ↓↓↓
  {
    code: '89_CONTROLES_GO_FINAUX', slug: 'controles-go-finaux', title: 'Contrôles gros œuvre finaux', famille: 'CHANTIER_GO', order: 8900,
    objectif: "Réaliser les contrôles structurels finaux avant réception du gros œuvre.",
    acteurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE', 'LABORATOIRE', 'ARCHITECTE'], validateurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE'],
    prerequis: ['84_FONDATIONS'], // recâblé dynamiquement sur le dernier plancher
    documentsAttendus: [{ nature: 'Rapport contrôles GO', formats: ['PDF'] }],
    pv: ['PV_CONTROLES_GO'], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '90_RECEPTION_GROS_OEUVRE', slug: 'reception-gros-oeuvre', title: 'Réception gros œuvre', famille: 'CHANTIER_GO', order: 9000,
    objectif: "Réceptionner l'ensemble du gros œuvre avant lancement du second œuvre.",
    acteurs: ['ARCHITECTE', 'BET_STRUCTURE', 'BUREAU_CONTROLE', 'ENTREPRISE_GO', 'CLIENT'], validateurs: ['ARCHITECTE', 'BET_STRUCTURE'], prerequis: ['89_CONTROLES_GO_FINAUX'],
    documentsAttendus: [{ nature: 'PV réception gros œuvre', formats: ['PDF'] }],
    pv: ['PV_RECEPTION_GROS_OEUVRE'], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: true,
  },

  // ════════════════ G. CHANTIER — SECOND ŒUVRE ════════════════
  // ↓↓↓ Lots réseaux encastrés (9100+), tests (9150), lots finitions (9200+), ascenseur ↓↓↓
  {
    code: '92_FIN_SECOND_OEUVRE', slug: 'fin-second-oeuvre', title: 'Achèvement second œuvre', famille: 'CHANTIER_SECOND_OEUVRE', order: 9300,
    objectif: "Constater l'achèvement de l'ensemble des lots de second œuvre.",
    acteurs: ['ARCHITECTE', 'ENTREPRISE_LOT', 'CLIENT'], validateurs: ['ARCHITECTE'],
    prerequis: ['90_RECEPTION_GROS_OEUVRE'], // recâblé dynamiquement sur tous les lots
    documentsAttendus: [{ nature: 'PV achèvement lots', formats: ['PDF'] }],
    pv: ['PV_ACHEVEMENT_LOTS'], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },

  // ════════════════ H. RÉCEPTION (ex-P3, intégrée P1/P2) ════════════════
  {
    code: '93_RECEPTION_PROVISOIRE', slug: 'reception-provisoire', title: 'Réception provisoire', famille: 'RECEPTION', order: 9400,
    objectif: "Prononcer la réception provisoire avec liste de réserves.",
    acteurs: ['ARCHITECTE', 'BUREAU_CONTROLE', 'ENTREPRISE_GO', 'ENTREPRISE_LOT', 'CLIENT'], validateurs: ['ARCHITECTE', 'CLIENT'], prerequis: ['92_FIN_SECOND_OEUVRE'],
    documentsAttendus: [{ nature: 'PV réception provisoire + réserves', formats: ['PDF'] }],
    pv: ['PV_RECEPTION_PROVISOIRE'], generation: 'FIXE',
    marketplace: { ...NO_MARKET, cercle: 'CERCLE_RECEPTION' }, paiementMilestone: true,
  },
  {
    code: '94_LEVEE_RESERVES', slug: 'levee-reserves', title: 'Levée des réserves', famille: 'RECEPTION', order: 9450,
    objectif: "Lever les réserves émises à la réception provisoire (lots concernés uniquement).",
    acteurs: ['ENTREPRISE_GO', 'ENTREPRISE_LOT', 'ARCHITECTE', 'CLIENT'], validateurs: ['ARCHITECTE', 'CLIENT'], prerequis: ['93_RECEPTION_PROVISOIRE'],
    documentsAttendus: [{ nature: 'PV levée de réserves', formats: ['PDF'] }],
    pv: ['PV_LEVEE_RESERVES'], generation: 'FIXE',
    marketplace: { mode: 'PRIORITAIRE', cercle: 'CERCLE_SECOND_OEUVRE', categories: ['ENTREPRISE_LOT'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '95A_CONFORMITE_SECURITE_INCENDIE', slug: 'conformite-securite-incendie', title: 'Conformité sécurité incendie', famille: 'RECEPTION', order: 9500,
    objectif: "Faire constater la conformité sécurité incendie en fin de chantier (protection civile).",
    acteurs: ['ADMINISTRATION', 'BUREAU_CONTROLE', 'BET_FLUIDES', 'ARCHITECTE'], validateurs: ['ADMINISTRATION'], prerequis: ['94_LEVEE_RESERVES'],
    documentsAttendus: [{ nature: 'PV conformité sécurité incendie', formats: ['PDF'] }],
    pv: ['PV_CONFORMITE_INCENDIE'], generation: 'FIXE', conditionFlag: 'securiteIncendie',
    marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '95C_CONFORMITE_ASCENSEUR', slug: 'conformite-ascenseur', title: 'Conformité ascenseur', famille: 'RECEPTION', order: 9510,
    objectif: "Faire constater la conformité finale de l'ascenseur avant mise en service.",
    acteurs: ['BUREAU_CONTROLE_ASCENSEUR', 'ASCENSORISTE', 'ARCHITECTE'], validateurs: ['BUREAU_CONTROLE_ASCENSEUR'], prerequis: ['94_LEVEE_RESERVES'],
    documentsAttendus: [{ nature: 'PV conformité ascenseur', formats: ['PDF'] }],
    pv: ['PV_CONFORMITE_ASCENSEUR'], generation: 'FIXE', conditionFlag: 'ascenseur',
    marketplace: { ...NO_MARKET, cercle: 'CERCLE_RECEPTION' }, paiementMilestone: false,
  },
  {
    code: '95B_RACCORDEMENTS_DEFINITIFS', slug: 'raccordements-definitifs', title: 'Raccordements définitifs', famille: 'RECEPTION', order: 9520,
    objectif: "Constituer et suivre les branchements définitifs eau / électricité / assainissement / télécom auprès des concessionnaires.",
    acteurs: ['CLIENT', 'CONCESSIONNAIRE', 'ARCHITECTE', 'ENTREPRISE_LOT'], validateurs: ['ARCHITECTE'], prerequis: ['94_LEVEE_RESERVES'],
    documentsAttendus: [{ nature: 'Contrats branchements définitifs + PV essais réseaux', formats: ['PDF'] }],
    pv: ['PV_ESSAIS_RESEAUX_FINAUX', 'PV_RACCORDEMENT_DEFINITIF'], generation: 'FIXE', conditionFlag: 'raccordementsDefinitifs',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_RECEPTION', categories: ['SUIVI_CONCESSIONNAIRE'], commandeMateriaux: false, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  },
  {
    code: '95_CONFORMITE_ADMINISTRATIVE', slug: 'conformite-administrative', title: 'Conformité administrative', famille: 'RECEPTION', order: 9550,
    objectif: "Constituer le dossier de conformité pour l'administration avant délivrance du permis d'habiter.",
    acteurs: ['ARCHITECTE', 'ADMINISTRATION', 'BUREAU_CONTROLE', 'CLIENT'], validateurs: ['ARCHITECTE'], prerequis: ['94_LEVEE_RESERVES'], // recâblé dynamiquement sur conformités conditionnelles
    documentsAttendus: [
      { nature: 'Dossier de conformité (plans conformes, urbanisme)', formats: ['PDF'] },
      { nature: 'PV conformité sécurité incendie', formats: ['PDF'], conditionFlag: 'securiteIncendie' },
      { nature: 'PV conformité ascenseur', formats: ['PDF'], conditionFlag: 'ascenseur' },
    ],
    pv: [], generation: 'FIXE', marketplace: { ...NO_MARKET, cercle: 'CERCLE_RECEPTION' }, paiementMilestone: false,
  },
  {
    code: '96_PERMIS_HABITER', slug: 'permis-habiter', title: 'Permis d\'habiter / certificat de conformité', famille: 'RECEPTION', order: 9600,
    objectif: "Suivre et archiver la délivrance du permis d'habiter / certificat de conformité (décision administrative).",
    acteurs: ['ADMINISTRATION', 'ARCHITECTE', 'CLIENT'], validateurs: ['ADMINISTRATION'], prerequis: ['95_CONFORMITE_ADMINISTRATIVE'],
    documentsAttendus: [{ nature: 'Permis d\'habiter / certificat conformité', formats: ['PDF'], obligatoire: true }],
    pv: [], generation: 'FIXE', marketplace: NO_MARKET, paiementMilestone: false,
  },
  {
    code: '97_RECEPTION_DEFINITIVE', slug: 'reception-definitive', title: 'Réception définitive', famille: 'RECEPTION', order: 9700,
    objectif: "Prononcer la réception définitive contractuelle après la période de garantie.",
    acteurs: ['ARCHITECTE', 'CLIENT', 'ENTREPRISE_GO', 'ENTREPRISE_LOT'], validateurs: ['ARCHITECTE', 'CLIENT'], prerequis: ['96_PERMIS_HABITER'],
    documentsAttendus: [{ nature: 'PV réception définitive', formats: ['PDF'] }],
    pv: ['PV_RECEPTION_DEFINITIVE'], generation: 'FIXE', marketplace: { ...NO_MARKET, cercle: 'CERCLE_RECEPTION' }, paiementMilestone: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// TEMPLATES DYNAMIQUES
// ─────────────────────────────────────────────────────────────────────────

export const TEMPLATE_SOUS_SOL: Omit<PhaseDef, 'code' | 'slug' | 'title' | 'order' | 'prerequis'> = {
  famille: 'CHANTIER_GO',
  objectif: "Réaliser le sous-sol : voiles périphériques, radier, poteaux/poutres, étanchéité, drainage, réseaux sous dallage, ventilation/désenfumage.",
  acteurs: ['ENTREPRISE_GO', 'BET_STRUCTURE', 'BET_FLUIDES', 'LABORATOIRE', 'BUREAU_CONTROLE', 'ARCHITECTE'],
  validateurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE'],
  documentsAttendus: [
    { nature: 'Plans BA sous-sol', formats: ['PDF', 'DWG'] },
    { nature: 'Bons béton + essais', formats: ['PDF'] },
    { nature: 'Photos avancement', formats: ['JPEG', 'PNG'] },
  ],
  pv: ['PV_AVANT_BETONNAGE', 'PV_PLANCHER', 'PV_RESEAUX_SOUS_DALLAGE', 'PV_DRAINAGE'],
  generation: 'DYNAMIQUE_SOUS_SOL',
  marketplace: {
    mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE',
    categories: ['ENTREPRISE_GO', 'MAT_BETON', 'MAT_ACIER', 'MAT_COFFRAGE', 'MAT_ETANCHEITE', 'MAT_DRAINAGE', 'LABORATOIRE'],
    commandeMateriaux: true, commandeService: true, suiviRetour: true,
  },
  paiementMilestone: true,
};

export const TEMPLATE_PLANCHER: Omit<PhaseDef, 'code' | 'slug' | 'title' | 'order' | 'prerequis'> = {
  famille: 'CHANTIER_GO',
  objectif: "Réaliser le plancher : poteaux, voiles, poutres, coffrage, ferraillage, réseaux incorporés, réservations, réception avant bétonnage, essais béton, décoffrage.",
  acteurs: ['ENTREPRISE_GO', 'BET_STRUCTURE', 'LABORATOIRE', 'BUREAU_CONTROLE', 'ARCHITECTE'],
  validateurs: ['BET_STRUCTURE', 'BUREAU_CONTROLE'],
  documentsAttendus: [
    { nature: 'Plans BA niveau', formats: ['PDF', 'DWG'] },
    { nature: 'Bons béton + essais', formats: ['PDF'] },
    { nature: 'Photos avancement', formats: ['JPEG', 'PNG'] },
  ],
  pv: ['PV_AVANT_BETONNAGE', 'PV_PLANCHER'],
  generation: 'DYNAMIQUE_PLANCHER',
  marketplace: {
    mode: 'STRICT', cercle: 'CERCLE_GROS_OEUVRE',
    categories: ['ENTREPRISE_GO', 'MAT_BETON', 'MAT_ACIER', 'MAT_COFFRAGE', 'LABORATOIRE'],
    commandeMateriaux: true, commandeService: true, suiviRetour: true,
  },
  paiementMilestone: true,
};

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
export const LOTS_SECOND_OEUVRE: LotDef[] = [
  { code: 'LOT_MACONNERIE', slug: 'maconnerie', title: 'Maçonnerie / cloisons', categorieMateriau: 'MAT_MACONNERIE', vague: 'RESEAUX', pv: ['PV_LOT'] },
  { code: 'LOT_PLOMBERIE', slug: 'plomberie', title: 'Plomberie', categorieMateriau: 'MAT_PLOMBERIE', vague: 'RESEAUX', pv: ['PV_LOT', 'PV_TEST_PRESSION'], validateursSup: ['BET_FLUIDES'] },
  { code: 'LOT_ELECTRICITE', slug: 'electricite', title: 'Électricité', categorieMateriau: 'MAT_ELECTRICITE', vague: 'RESEAUX', pv: ['PV_LOT', 'PV_TEST_ELEC'], validateursSup: ['BET_FLUIDES'] },
  { code: 'LOT_CVC', slug: 'cvc', title: 'Climatisation / chauffage / ventilation', categorieMateriau: 'MAT_CVC', vague: 'RESEAUX', pv: ['PV_LOT', 'PV_TEST_CVC'], validateursSup: ['BET_FLUIDES'] },
  { code: 'LOT_DOMOTIQUE', slug: 'domotique', title: 'Domotique / courants faibles', categorieMateriau: 'MAT_ELECTRICITE', vague: 'RESEAUX', pv: ['PV_LOT'], validateursSup: ['BET_FLUIDES'] },
  { code: 'LOT_ETANCHEITE', slug: 'etancheite', title: 'Étanchéité', categorieMateriau: 'MAT_ETANCHEITE', vague: 'INDEPENDANT', pv: ['PV_LOT', 'PV_TEST_ETANCHEITE'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_ISOLATION', slug: 'isolation', title: 'Isolation thermique & acoustique', categorieMateriau: 'MAT_ISOLATION', vague: 'INDEPENDANT', pv: ['PV_LOT'] },
  { code: 'LOT_FERRONNERIE', slug: 'ferronnerie', title: 'Ferronnerie / garde-corps', categorieMateriau: 'MAT_ACIER', vague: 'INDEPENDANT', pv: ['PV_LOT'] },
  { code: 'LOT_FACADE', slug: 'facade', title: 'Façade / revêtement extérieur', categorieMateriau: 'MAT_MACONNERIE', vague: 'INDEPENDANT', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_PORTAIL_CLOTURE', slug: 'portail-cloture', title: 'Portail & clôture', categorieMateriau: 'MAT_ACIER', vague: 'INDEPENDANT', pv: ['PV_LOT'] },
  { code: 'LOT_AMENAGEMENT_EXT', slug: 'amenagement-exterieur', title: 'Aménagement extérieur / VRD parcelle', categorieMateriau: 'MAT_AMENAGEMENT_EXT', vague: 'INDEPENDANT', pv: ['PV_LOT'] },
  { code: 'LOT_MENUISERIE_BOIS', slug: 'menuiserie-bois', title: 'Menuiserie bois', categorieMateriau: 'MAT_MENUISERIE_BOIS', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_MENUISERIE_ALU', slug: 'menuiserie-alu', title: 'Menuiserie aluminium', categorieMateriau: 'MAT_MENUISERIE_ALU', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_FAUX_PLAFOND', slug: 'faux-plafond', title: 'Faux plafonds', categorieMateriau: 'MAT_FAUX_PLAFOND', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_ENDUITS', slug: 'enduits', title: 'Enduits & ravalement', categorieMateriau: 'MAT_MACONNERIE', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_CARRELAGE', slug: 'carrelage', title: 'Carrelage / faïence', categorieMateriau: 'MAT_CARRELAGE', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_REVETEMENT_SOL', slug: 'revetement-sol', title: 'Revêtements de sol', categorieMateriau: 'MAT_REVETEMENT_SOL', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_SANITAIRE', slug: 'sanitaire', title: 'Appareils sanitaires', categorieMateriau: 'MAT_SANITAIRE', vague: 'FINITION', pv: ['PV_LOT'], validateursSup: ['BET_FLUIDES'] },
  { code: 'LOT_PEINTURE', slug: 'peinture', title: 'Peinture', categorieMateriau: 'MAT_PEINTURE', vague: 'FINITION', pv: ['PV_LOT'], pvSupport: ['PV_RECEPTION_SUPPORT'] },
  { code: 'LOT_VITRERIE', slug: 'vitrerie', title: 'Vitrerie / miroiterie', categorieMateriau: 'MAT_VITRERIE', vague: 'FINITION', pv: ['PV_LOT'] },
];

// ─────────────────────────────────────────────────────────────────────────
// MOTEUR DE GÉNÉRATION
// ─────────────────────────────────────────────────────────────────────────

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

/** Planchers GO hors sol = RDC + (R1..RN) + couverture. Renvoie la liste ordonnée. */
function planchersHorsSol(nbEtagesHorsSol: number): { title: string; slugPart: string }[] {
  const out: { title: string; slugPart: string }[] = [{ title: 'RDC', slugPart: 'rdc' }];
  for (let i = 1; i <= nbEtagesHorsSol; i++) out.push({ title: `R+${i}`, slugPart: `r${i}` });
  out.push({ title: 'Terrasse / couverture', slugPart: 'terrasse' });
  return out;
}

/**
 * Génération INTERNE non validée. Ne pas appeler directement depuis l'API :
 * utiliser generatePhases() (wrapper sûr) ou buildPhaseIndex().
 */
function _generatePhasesInternal(dossier: DossierShape): PhaseDef[] {
  const fixes = PHASES_FIXES.filter((p) => {
    if (p.conditionFlag && !dossier.flags[p.conditionFlag]) return false;
    if (p.conditionFoncier && !p.conditionFoncier.includes(dossier.typeOperationFoncier)) return false;
    return true;
  }).map((p) => ({ ...p, prerequis: [...p.prerequis] }));

  const out: PhaseDef[] = [];
  const lotsCodes: string[] = [];
  const lotsReseaux: string[] = [];
  const lotsFinition: string[] = [];
  let lastGOcode = '84_FONDATIONS';

  for (const p of fixes) {
    out.push(p);

    if (p.code === '84_FONDATIONS') {
      let prevCode = '84_FONDATIONS';
      for (let n = dossier.nbSousSols; n >= 1; n--) {
        const code = `85_SOUS_SOL_${n}`;
        out.push({ ...TEMPLATE_SOUS_SOL, code, slug: `chantier-sous-sol-${n}`, title: `Sous-sol −${n}`,
          order: 8500 + (dossier.nbSousSols - n) * 10, prerequis: [prevCode] });
        prevCode = code;
      }
      const niveaux = planchersHorsSol(dossier.nbEtagesHorsSol);
      niveaux.forEach((niv, i) => {
        const code = `86_PLANCHER_${niv.slugPart.toUpperCase()}`;
        out.push({ ...TEMPLATE_PLANCHER, code, slug: `chantier-gros-oeuvre-${niv.slugPart}`, title: `Plancher ${niv.title}`,
          order: 8600 + i * 10, prerequis: [prevCode] });
        prevCode = code;
      });
      lastGOcode = prevCode;
    }

    if (p.code === '90_RECEPTION_GROS_OEUVRE') {
      const applicables = dossier.lotsApplicables
        ? LOTS_SECOND_OEUVRE.filter((l) => dossier.lotsApplicables!.includes(l.slug))
        : LOTS_SECOND_OEUVRE;

      // Vague 1 : réseaux encastrés + indépendants (prérequis = réception GO).
      applicables.filter((l) => l.vague === 'RESEAUX' || l.vague === 'INDEPENDANT').forEach((lot, idx) => {
        out.push(buildLot(lot, 9100 + idx * 5, ['90_RECEPTION_GROS_OEUVRE']));
        lotsCodes.push(lot.code);
        if (lot.vague === 'RESEAUX') lotsReseaux.push(lot.code);
      });

      // Ascenseur conditionnel.
      if (dossier.flags.ascenseur) {
        out.push({
          code: 'LOT_ASCENSEUR', slug: 'lot-ascenseur', title: 'Ascenseur (lot électromécanique)',
          famille: 'CHANTIER_SECOND_OEUVRE', order: 9180,
          objectif: "Installer l'ascenseur (essais et contrôle de conformité spécialisés).",
          acteurs: ['ASCENSORISTE', 'BUREAU_CONTROLE_ASCENSEUR', 'ARCHITECTE', 'CLIENT'],
          validateurs: ['BUREAU_CONTROLE_ASCENSEUR', 'ARCHITECTE'], prerequis: ['90_RECEPTION_GROS_OEUVRE'],
          documentsAttendus: [{ nature: 'PV essais + conformité ascenseur', formats: ['PDF'] }],
          pv: ['PV_RECEPTION_ASCENSEUR'], generation: 'DYNAMIQUE_LOT',
          marketplace: { mode: 'STRICT', cercle: 'CERCLE_SECOND_OEUVRE', categories: ['ASCENSORISTE', 'MAT_ASCENSEUR', 'BUREAU_CONTROLE_ASCENSEUR'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
          paiementMilestone: false,
        });
        lotsCodes.push('LOT_ASCENSEUR');
      }

      // Lot d'exécution sécurité incendie conditionnel (SSI, désenfumage, RIA, signalétique).
      if (dossier.flags.securiteIncendie) {
        out.push({
          code: 'LOT_SECURITE_INCENDIE', slug: 'lot-securite-incendie', title: 'Lot sécurité incendie (SSI, désenfumage, RIA)',
          famille: 'CHANTIER_SECOND_OEUVRE', order: 9185,
          objectif: "Installer les équipements de sécurité incendie : SSI, désenfumage, RIA, extincteurs, signalétique, éclairage de sécurité.",
          acteurs: ['ENTREPRISE_LOT', 'BET_FLUIDES', 'BUREAU_CONTROLE', 'ARCHITECTE'],
          validateurs: ['BET_FLUIDES', 'BUREAU_CONTROLE', 'ARCHITECTE'], prerequis: ['90_RECEPTION_GROS_OEUVRE'],
          documentsAttendus: [{ nature: 'PV essais équipements incendie', formats: ['PDF'] }],
          pv: ['PV_ESSAIS_INCENDIE'], generation: 'DYNAMIQUE_LOT',
          marketplace: { mode: 'STRICT', cercle: 'CERCLE_SECOND_OEUVRE', categories: ['ENTREPRISE_LOT', 'BET_FLUIDES', 'MAT_SECURITE_INCENDIE'], commandeMateriaux: true, commandeService: true, suiviRetour: true },
          paiementMilestone: false,
        });
        lotsCodes.push('LOT_SECURITE_INCENDIE');
      }

      // Tests réseaux — dépend des lots réseaux présents.
      let testsCode: string | null = null;
      if (lotsReseaux.length > 0) {
        testsCode = '91_TESTS_RESEAUX';
        out.push({
          code: testsCode, slug: 'tests-reseaux', title: 'Tests réseaux avant fermeture',
          famille: 'CHANTIER_SECOND_OEUVRE', order: 9190,
          objectif: "Tester plomberie / électricité / CVC avant fermeture des cloisons et faux plafonds.",
          acteurs: ['BET_FLUIDES', 'ENTREPRISE_LOT', 'ARCHITECTE'], validateurs: ['BET_FLUIDES', 'ARCHITECTE'],
          prerequis: [...lotsReseaux],
          documentsAttendus: [{ nature: 'PV essais réseaux', formats: ['PDF'] }],
          pv: ['PV_TEST_PRESSION', 'PV_TEST_ELEC', 'PV_TEST_CVC'], generation: 'DYNAMIQUE_LOT',
          marketplace: NO_MARKET, paiementMilestone: false,
        });
        lotsCodes.push(testsCode);
      }

      // Vague 2 : finitions (prérequis = tests réseaux si présents, sinon réception GO).
      const finitionPrereq = testsCode ? [testsCode] : ['90_RECEPTION_GROS_OEUVRE'];
      applicables.filter((l) => l.vague === 'FINITION').forEach((lot, idx) => {
        out.push(buildLot(lot, 9200 + idx * 5, finitionPrereq));
        lotsCodes.push(lot.code);
        lotsFinition.push(lot.code);
      });
    }
  }

  // P0 : contrôles GO finaux → dernier plancher.
  const ctrl = out.find((x) => x.code === '89_CONTROLES_GO_FINAUX');
  if (ctrl) ctrl.prerequis = [lastGOcode];

  // P0 : achèvement second œuvre → tous les lots générés.
  const fin = out.find((x) => x.code === '92_FIN_SECOND_OEUVRE');
  if (fin && lotsCodes.length > 0) fin.prerequis = [...lotsCodes];

  // P0 audit-2 : recâblage conditionnel des branches amont sur 30_DOSSIER_AUTORISATION.
  const auto = out.find((x) => x.code === '30_DOSSIER_AUTORISATION');
  if (auto) {
    const pre = new Set(auto.prerequis);
    if ((dossier.typeOperationFoncier !== 'aucun') && out.some((x) => x.code === '29_AUTORISATION_LOTIR')) pre.add('29_AUTORISATION_LOTIR');
    if (dossier.flags.securiteIncendie && out.some((x) => x.code === '24_AVIS_PROTECTION_CIVILE')) pre.add('24_AVIS_PROTECTION_CIVILE');
    auto.prerequis = [...pre];
  }

  // P0 audit-2 : recâblage conditionnel des conformités aval sur 95_CONFORMITE_ADMINISTRATIVE.
  const conf = out.find((x) => x.code === '95_CONFORMITE_ADMINISTRATIVE');
  if (conf) {
    const pre = new Set(conf.prerequis);
    if (dossier.flags.securiteIncendie && out.some((x) => x.code === '95A_CONFORMITE_SECURITE_INCENDIE')) pre.add('95A_CONFORMITE_SECURITE_INCENDIE');
    if (dossier.flags.ascenseur && out.some((x) => x.code === '95C_CONFORMITE_ASCENSEUR')) pre.add('95C_CONFORMITE_ASCENSEUR');
    if (dossier.flags.raccordementsDefinitifs && out.some((x) => x.code === '95B_RACCORDEMENTS_DEFINITIFS')) pre.add('95B_RACCORDEMENTS_DEFINITIFS');
    conf.prerequis = [...pre];
  }

  // P0 audit-3 : le DCE dépend du métré (lui-même dépendant de 42 transitivement).
  // Vague A : si 48_METRE_QUANTITATIF est présent (cas standard catalogue v7+vague A),
  // DCE pointe sur 48 ; sinon fallback historique sur 42 direct.
  const dce = out.find((x) => x.code === '50_DCE');
  if (dce) {
    if (out.some((x) => x.code === '48_METRE_QUANTITATIF')) dce.prerequis = ['48_METRE_QUANTITATIF'];
    else if (out.some((x) => x.code === '42_VISA_STRUCTURE_CONTROLE')) dce.prerequis = ['42_VISA_STRUCTURE_CONTROLE'];
  }

  // P0 audit-3 : si financement actif, les raccordements provisoires dépendent du déblocage initial.
  if (dossier.flags.financementBancaire) {
    const racc = out.find((x) => x.code === '58_RACCORDEMENTS_PROVISOIRES');
    if (racc && out.some((x) => x.code === '57_DEBLOCAGE_INITIAL')) racc.prerequis = [...new Set([...racc.prerequis, '57_DEBLOCAGE_INITIAL'])];
  }

  // P0 audit-3 : si lotissement complet, le dossier d'autorisation de construire suit le bornage.
  if ((dossier.typeOperationFoncier !== 'aucun')) {
    // Recâbler 29D : dépend de 29C si équipement existe, sinon de 29_AUTORISATION_LOTIR.
    const bornage = out.find((x) => x.code === '29D_BORNAGE_TITRES');
    if (bornage && !out.some((x) => x.code === '29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT')) {
      bornage.prerequis = ['29_AUTORISATION_LOTIR'];
    }
    const auto2 = out.find((x) => x.code === '30_DOSSIER_AUTORISATION');
    if (auto2 && out.some((x) => x.code === '29D_BORNAGE_TITRES')) auto2.prerequis = [...new Set([...auto2.prerequis, '29D_BORNAGE_TITRES'])];
  }

  // P1 audit-3 : la conformité incendie dépend du lot d'exécution incendie.
  if (dossier.flags.securiteIncendie) {
    const confInc = out.find((x) => x.code === '95A_CONFORMITE_SECURITE_INCENDIE');
    if (confInc && out.some((x) => x.code === 'LOT_SECURITE_INCENDIE')) confInc.prerequis = [...new Set([...confInc.prerequis, 'LOT_SECURITE_INCENDIE'])];
  }

  // ─── Vague A — recâblages dynamiques pour les 4 phases conditionnelles ───

  // Vague A C10+C2 : si terrainNonBorne, l'étude géotechnique attend le bornage 08.
  if (dossier.flags.terrainNonBorne) {
    const geo = out.find((x) => x.code === '04_ETUDE_GEOTECHNIQUE');
    if (geo && out.some((x) => x.code === '08_BORNAGE_IMMATRICULATION')) {
      // Remplacer (pas ajouter) : 08 dépend déjà de 02 donc transitivement 04 dépend de 02.
      geo.prerequis = ['08_BORNAGE_IMMATRICULATION'];
    }
  }

  // Vague A C9 : si demolitionExistant, le dossier d'autorisation dépend AUSSI du permis de démolir.
  if (dossier.flags.demolitionExistant) {
    const auto = out.find((x) => x.code === '30_DOSSIER_AUTORISATION');
    if (auto && out.some((x) => x.code === '27_PERMIS_DEMOLIR')) {
      auto.prerequis = [...new Set([...auto.prerequis, '27_PERMIS_DEMOLIR'])];
    }
  }

  // Vague A C6+C7 : si chantierComplexe, l'ouverture de chantier dépend AUSSI d'OPC + SPS.
  // (Sinon ces phases seraient orphelines — décision : raccordement aval sur 80.)
  if (dossier.flags.chantierComplexe) {
    const ouv = out.find((x) => x.code === '80_OUVERTURE_CHANTIER');
    if (ouv) {
      const adds: string[] = [];
      if (out.some((x) => x.code === '55_MANDAT_OPC')) adds.push('55_MANDAT_OPC');
      if (out.some((x) => x.code === '56B_MISSION_SPS')) adds.push('56B_MISSION_SPS');
      if (adds.length > 0) ouv.prerequis = [...new Set([...ouv.prerequis, ...adds])];
    }
  }

  return out.sort((a, b) => a.order - b.order);
}

function buildLot(lot: LotDef, order: number, prerequis: string[]): PhaseDef {
  return {
    code: lot.code, slug: `lot-${lot.slug}`, title: lot.title,
    famille: 'CHANTIER_SECOND_OEUVRE', order,
    objectif: `Réaliser le lot « ${lot.title} » (vague ${lot.vague.toLowerCase()}).`,
    acteurs: ['ENTREPRISE_LOT', 'ARCHITECTE', 'CLIENT'],
    validateurs: ['ARCHITECTE', ...(lot.validateursSup ?? [])],
    prerequis,
    documentsAttendus: [
      { nature: `Devis / commande ${lot.title}`, formats: ['PDF'] },
      { nature: 'Photos avancement', formats: ['JPEG', 'PNG'] },
    ],
    pv: [...(lot.pvSupport ?? []), ...lot.pv],
    generation: 'DYNAMIQUE_LOT',
    marketplace: { mode: 'STRICT', cercle: 'CERCLE_SECOND_OEUVRE', categories: ['ENTREPRISE_LOT', lot.categorieMateriau], commandeMateriaux: true, commandeService: true, suiviRetour: true },
    paiementMilestone: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// INDEX + VALIDATION
// ─────────────────────────────────────────────────────────────────────────

export interface PhaseIndex {
  bySlug: Record<string, PhaseDef>;
  byCode: Record<string, PhaseDef>;
  ordered: PhaseDef[];
}

/**
 * Génération PUBLIQUE sûre : valide le dossier puis génère. Lève une erreur si
 * invalide. C'est la seule API de génération à utiliser depuis le backend/API.
 */
export function generatePhases(dossier: DossierShape): PhaseDef[] {
  const v = validateDossier(dossier);
  if (!v.ok) throw new Error(`Dossier invalide, génération refusée :\n- ${v.errors.join('\n- ')}`);
  return _generatePhasesInternal(dossier);
}

/**
 * Construit l'index navigable. VALIDE d'abord le dossier et lève une erreur si
 * invalide (P0 : aucune génération sans validation préalable). Le service
 * backend doit AUSSI appeler validateDossier() en amont pour un message propre.
 */
export function buildPhaseIndex(dossier: DossierShape): PhaseIndex {
  const v = validateDossier(dossier);
  if (!v.ok) throw new Error(`Dossier invalide, génération refusée :\n- ${v.errors.join('\n- ')}`);
  const ordered = _generatePhasesInternal(dossier);
  const bySlug: Record<string, PhaseDef> = {};
  const byCode: Record<string, PhaseDef> = {};
  for (const p of ordered) { bySlug[p.slug] = p; byCode[p.code] = p; }
  return { bySlug, byCode, ordered };
}

/** Bornes métier par porte (P0 audit-4 : éviter collisions order et abus). */
export const BORNES = {
  P1: { maxEtagesHorsSol: 4, maxSousSols: 2 },
  P2: { maxEtagesHorsSol: 10, maxSousSols: 5 },
} as const;

const PORTES_VALIDES = ['P1', 'P2'] as const;
const FONCIER_VALIDES: TypeOperationFoncier[] = ['aucun', 'morcellement', 'groupeHabitation', 'lotissement'];
const FLAGS_REQUIS = [
  'securiteIncendie', 'ascenseur', 'financementBancaire', 'raccordementsDefinitifs',
  // Vague A — 3 nouveaux flags
  'terrainNonBorne', 'chantierComplexe', 'demolitionExistant',
] as const;

/**
 * Audit complet. Deux étages :
 *  1. Validation runtime DÉFENSIVE des entrées (le JSON d'API n'est pas typé) —
 *     court-circuite AVANT toute génération si une primitive est invalide.
 *  2. Audit structurel (collisions, prérequis, DAG, orphelines) sur le graphe généré.
 */
export function validateDossier(dossier: DossierShape): { ok: boolean; errors: string[] } {
  // ── Étage 0 : l'entrée elle-même doit être un objet ──
  if (dossier === null || dossier === undefined || typeof dossier !== 'object')
    return { ok: false, errors: ['dossier manquant ou non-objet.'] };

  // ── Étage 1 : garde-fous runtime (retour immédiat, pas de génération) ──
  const d = dossier as unknown as Record<string, unknown>;
  if (!PORTES_VALIDES.includes(d.porte as never))
    return { ok: false, errors: ['porte invalide : attendu P1 ou P2.'] };
  if (!FONCIER_VALIDES.includes(d.typeOperationFoncier as TypeOperationFoncier))
    return { ok: false, errors: ['typeOperationFoncier invalide : attendu aucun/morcellement/groupeHabitation/lotissement.'] };
  if (!d.flags || typeof d.flags !== 'object')
    return { ok: false, errors: ['flags manquant ou invalide.'] };
  const flags = d.flags as Record<string, unknown>;
  for (const key of FLAGS_REQUIS) {
    if (typeof flags[key] !== 'boolean') return { ok: false, errors: [`flags.${key} doit être un booléen.`] };
  }
  if (typeof d.nbEtagesHorsSol !== 'number' || !Number.isInteger(d.nbEtagesHorsSol))
    return { ok: false, errors: ['nbEtagesHorsSol doit être un entier.'] };
  if (typeof d.nbSousSols !== 'number' || !Number.isInteger(d.nbSousSols))
    return { ok: false, errors: ['nbSousSols doit être un entier.'] };
  if (d.lotsApplicables !== undefined && !Array.isArray(d.lotsApplicables))
    return { ok: false, errors: ['lotsApplicables doit être un tableau de slugs ou undefined.'] };

  // ── Étage 1b : bornes métier (porte déjà validée, BORNES[porte] sûr) ──
  const errors: string[] = [];
  if (dossier.nbEtagesHorsSol < 0) errors.push('nbEtagesHorsSol doit être >= 0 (0 = RDC seul).');
  if (dossier.nbSousSols < 0) errors.push('nbSousSols ne peut être négatif.');
  const b = BORNES[dossier.porte];
  if (dossier.nbEtagesHorsSol > b.maxEtagesHorsSol) errors.push(`nbEtagesHorsSol dépasse la borne ${dossier.porte} (max ${b.maxEtagesHorsSol}).`);
  if (dossier.nbSousSols > b.maxSousSols) errors.push(`nbSousSols dépasse la borne ${dossier.porte} (max ${b.maxSousSols}).`);
  if (dossier.lotsApplicables !== undefined && dossier.lotsApplicables.length === 0)
    errors.push('lotsApplicables ne peut être un tableau vide (undefined = tous, sinon sélection explicite).');
  if (dossier.lotsApplicables) {
    const valides = new Set(LOTS_SECOND_OEUVRE.map((l) => l.slug));
    for (const s of dossier.lotsApplicables) if (!valides.has(s)) errors.push(`Lot inconnu : ${s}`);
  }
  // Court-circuit : ne pas générer un graphe massif sur des bornes déjà fausses.
  if (errors.length > 0) return { ok: false, errors };

  // ── Étage 2 : audit structurel du graphe ──
  const ordered = _generatePhasesInternal(dossier);
  const codes = new Set(ordered.map((p) => p.code));
  const seenSlug = new Set<string>();
  const seenCode = new Set<string>();
  const seenOrder = new Set<number>();
  for (const p of ordered) {
    if (seenSlug.has(p.slug)) errors.push(`Collision slug : ${p.slug}`);
    if (seenCode.has(p.code)) errors.push(`Collision code : ${p.code}`);
    if (seenOrder.has(p.order)) errors.push(`Collision order : ${p.order} (${p.code})`);
    if (p.slug.includes('/')) errors.push(`Slug non plat : ${p.slug}`);
    seenSlug.add(p.slug); seenCode.add(p.code); seenOrder.add(p.order);
    for (const pre of p.prerequis) if (!codes.has(pre)) errors.push(`Prérequis inexistant : ${p.code} → ${pre}`);
  }

  // DAG via tri topologique.
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const p of ordered) { indeg.set(p.code, 0); adj.set(p.code, []); }
  for (const p of ordered) for (const pre of p.prerequis) if (codes.has(pre)) {
    adj.get(pre)!.push(p.code); indeg.set(p.code, indeg.get(p.code)! + 1);
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([c]) => c);
  let visited = 0;
  while (queue.length) {
    const c = queue.shift()!; visited++;
    for (const nxt of adj.get(c)!) { indeg.set(nxt, indeg.get(nxt)! - 1); if (indeg.get(nxt) === 0) queue.push(nxt); }
  }
  if (visited !== ordered.length) errors.push('Cycle détecté dans le graphe de prérequis.');

  // Détection d'ORPHELINES : phase dont aucune autre ne dépend alors qu'elle
  // n'est pas le terminal légitime (97_RECEPTION_DEFINITIVE). Ce contrôle
  // attrape automatiquement le motif "branche présente mais non raccordée".
  const TERMINAUX = new Set(['97_RECEPTION_DEFINITIVE']);
  const aDesDependants = new Set<string>();
  for (const p of ordered) for (const pre of p.prerequis) aDesDependants.add(pre);
  for (const p of ordered) {
    if (!aDesDependants.has(p.code) && !TERMINAUX.has(p.code)) {
      errors.push(`Phase orpheline (rien n'en dépend) : ${p.code}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
