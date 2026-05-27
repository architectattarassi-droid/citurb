/**
 * apps/api/src/modules/zillow-ma/types.ts
 *
 * Types métier du module Zillow MA — estimation foncière Maroc.
 * Aligné sur le plan PIVOT_VISA_FONCIER_PLAN_Q3_2026.md (Livrable #2).
 */

/**
 * Famille de bien — aligné avec la nomenclature DGI / wizards P1-P5.
 * Conserve la granularité minimale qui pilote la pondération comparables
 * (un terrain nu ne se compare pas à une villa neuve).
 */
export type BienFamily =
  | "terrain_nu"
  | "terrain_constructible"
  | "villa"
  | "appartement"
  | "immeuble"
  | "local_commercial"
  | "bureau"
  | "industriel";

/**
 * Statut juridique simplifié d'une parcelle (vue Zillow — pas la doctrine
 * complète ANCFCC). Sert principalement à colorer le marker carte.
 */
export type StatutJuridique =
  | "TITRE_FONCIER"             // Immatriculé conservation foncière (ANCFCC)
  | "REQUISITION"               // En cours d'immatriculation
  | "MELK"                       // Bien melk non immatriculé
  | "COLLECTIF"                 // Terre collective (sulalates)
  | "HABOUS"                    // Bien habous
  | "DOMANIAL_PRIVE"            // Domaine privé de l'État
  | "DOMANIAL_PUBLIC"           // Domaine public — non aliénable
  | "INCONNU";

/**
 * Niveau de confiance affiché à l'utilisateur — calculé à partir du nb de
 * comparables, de leur fraîcheur, de leur dispersion (écart-type relatif),
 * et de la disponibilité du référentiel DGI sur la zone.
 *   - HIGH   : > 80 % — au moins 6 comparables récents (<12 mois) + DGI dispo
 *   - MEDIUM : 60-80 % — 3-5 comparables récents OU 6+ anciens + DGI dispo
 *   - LOW    : 40-60 % — peu de comparables OU pas de DGI
 *   - VERY_LOW : < 40 % — extrapolation, à manipuler avec prudence
 */
export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

/**
 * Une parcelle pilote du seed Zillow MA — données plausibles et cohérentes
 * avec le marché MA 2026, mais générées (pas extraites des registres réels).
 */
export type ParcellePilote = {
  /** ID stable (slug ville + numéro). Ex : "casa-anfa-001". */
  id: string;
  ville: string;
  villeId: "casablanca" | "marrakech" | "tanger";
  quartier: string;
  /** Adresse postale plausible (rue + numéro fictifs). */
  adresse: string;
  /** Centroïde WGS84. */
  lat: number;
  lng: number;
  /** Surface du foncier en m² (toujours > 0). */
  surfaceM2: number;
  bienFamily: BienFamily;
  statusJuridique: StatutJuridique;
  /** Prix DGI 2017 brut (DH/m²) — toujours disponible (seed maîtrisé). */
  prixDgi2017PerM2: number;
  /** Dernière transaction connue (peut être nulle = jamais vendue dans le seed). */
  derniereTransaction: {
    dateIso: string;        // ISO 8601
    prixMad: number;        // prix total transaction
    prixMadPerM2: number;
  } | null;
  /**
   * Numéro de titre foncier fictif (pour parcelles `TITRE_FONCIER`).
   * Format conforme : "12345/01" avec section conservation foncière.
   */
  titreFoncierRef: string | null;
  /** Tags affichés en chip (vue mer, ancien, neuf, lotissement homologué…). */
  tags: string[];
  /** URL image (placeholder externe — pas de fichier à shipper). */
  photoUrl?: string;
};

/**
 * Une transaction comparable historique (seed 1000 lignes fictives MA-cohérentes).
 * Utilisée par l'algorithme d'estimation : ne contient PAS d'ID personne.
 */
export type ComparableTransaction = {
  id: string;
  ville: string;
  villeId: "casablanca" | "marrakech" | "tanger";
  quartier: string;
  lat: number;
  lng: number;
  surfaceM2: number;
  bienFamily: BienFamily;
  prixMad: number;
  prixMadPerM2: number;
  dateIso: string;          // ISO 8601 de la transaction
  /** Source agrégée — pas de PII. */
  source: "DGI_DECLARATIVE" | "ANNONCE_SCRAPE" | "OBSERVATION_CITURBAREA" | "NOTAIRE_PARTENAIRE";
};

/** Réponse de l'endpoint POST /api/zillow-ma/estimation. */
export type EstimationResult = {
  /** Estimation centrale (DH) pour la surface fournie. */
  estimationMad: number;
  /** Estimation DH/m² central. */
  estimationMadPerM2: number;
  /** Borne basse (1σ inférieur). */
  fourchetteMin: number;
  /** Borne haute (1σ supérieur). */
  fourchetteMax: number;
  /** Confiance 0-100. */
  confidencePct: number;
  /** Tier dérivé du score (pour badge UI). */
  confidenceTier: ConfidenceTier;
  /** Nombre de comparables effectivement utilisés. */
  comparablesCount: number;
  /** Rayon (km) effectivement utilisé pour la collecte des comparables. */
  comparablesDansRayonKm: number;
  /** Référence DGI 2017 brute (avant correction IPAI). */
  dgiRef: {
    prixMin: number;
    prixMoy: number;
    prixMax: number;
    sourceDate: string;
  } | null;
  /** Correction IPAI BAM appliquée. */
  ipaiCorrection: {
    factor: number;
    year: number;
    source: "BAM";
  };
  /** Texte court expliquant la méthode (affiché dans EstimationResultCard). */
  methodologie: string;
  /** Sources officielles citables (DGI 2017, BAM IPAI, OSM, observations). */
  sources: string[];
  /**
   * Liste courte (≤ 5) des comparables les plus déterminants pour cette estimation,
   * ordonnés par poids décroissant. Utile pour la transparence frontend.
   */
  topComparables: Array<{
    id: string;
    quartier: string;
    surfaceM2: number;
    prixMadPerM2: number;
    dateIso: string;
    distanceKm: number;
    weight: number;
  }>;
  /** Disclaimer légal obligatoire. */
  disclaimer: string;
};

/** Payload d'entrée pour POST /api/zillow-ma/estimation. */
export type EstimationInput = {
  lat: number;
  lng: number;
  /** Si non fournie, on rend uniquement le prix DH/m². */
  surfaceM2?: number;
  bienFamily?: BienFamily;
  ville?: string;
  quartier?: string;
};

/** Résultat de l'autocomplete d'adresses. */
export type ParcelleSearchHit = {
  id: string;
  label: string;
  ville: string;
  quartier: string;
  lat: number;
  lng: number;
  matchScore: number;
};

/** Tile heatmap pour rendu carte agrégée par quartier. */
export type HeatmapPoint = {
  quartier: string;
  centroidLat: number;
  centroidLng: number;
  prixMoyPerM2: number;
  prixMedianPerM2: number;
  nbTransactions: number;
  /** Variation YoY observée sur les 24 derniers mois (peut être négative). */
  variationYoyPct: number;
};
