/**
 * TOME 5 — Prestataire Tarifs (types)
 *
 * Module Tarifs Contractuels Prestataires P6.
 * Chaque prestataire P6 dispose d'une grille tarifaire CONTRACTUALISÉE
 * avec CITURBAREA : prix engagés pour les clients de la plateforme.
 *
 * Doctrine: pas de modèle Prisma au MVP — stockage JSON + cache mémoire.
 * Migration future vers `prisma/dossiers/schema.prisma`.
 */

/** Unités de facturation pour un tarif contractuel. */
export type TarifUnite = "m2" | "ml" | "h" | "forfait" | "U";

/** Cycle de vie d'un tarif contractuel. */
export type TarifStatus =
  | "BROUILLON"
  | "VALIDE_CITURBAREA"
  | "PUBLIE"
  | "SUSPENDU";

/** Conditions opérationnelles d'application d'un tarif. */
export interface TarifConditions {
  /** Quantité minimum de commande (optionnel). */
  minQuantite?: number;
  /** Distance maximum de déplacement gratuite (km). */
  maxDeplacementKm?: number;
  /** Délai d'intervention contractuel en heures. */
  delaiInterventionH?: number;
  /** Prestations incluses dans le prix. */
  inclus: string[];
  /** Prestations explicitement exclues. */
  exclus: string[];
}

/** Engagements contractuels du prestataire envers CITURBAREA. */
export interface TarifGaranties {
  /** Délai d'intervention engagé (ex: "<24h", "<7j"). */
  delaiIntervention: string;
  /** Garantie travaux (ex: "1 an pièces et MO"). */
  garantieTravaux: string;
  /** Assurances détenues (ex: ["RC Pro", "Décennale"]). */
  assurances: string[];
}

/**
 * Modèle d'un tarif contractuel prestataire.
 */
export interface TarifContractuel {
  id: string;
  prestataireId: string;
  /** Corps de métier (lot TPHI ou catégorie standard). */
  corpsMetier: string;
  /** Code de la prestation standardisée (référence corpus). */
  prestation: string;
  unite: TarifUnite;
  /** Prix unitaire en MAD HT. */
  prixUnitaireMAD: number;
  conditions: TarifConditions;
  /** Codes régions HCP couvertes (ex: ["MA-01", "MA-07"]). */
  zoneIntervention: string[];
  status: TarifStatus;
  garanties: TarifGaranties;
  /** Date d'expiration du tarif (ISO 8601). */
  validUntil: string;
  /** Date de signature du contrat (ISO 8601). */
  contratSignedAt?: string;
  /** Commission CITURBAREA en pourcentage (ex: 5 = 5%). */
  commissionCiturbareaPct: number;
  /** Hash SHA-256 du contrat scellé (calculé à la signature). */
  hashContrat: string;
  /** Horodatage création. */
  createdAt: string;
  /** Horodatage dernière mise à jour. */
  updatedAt: string;
}

/**
 * Prestation standardisée du corpus BTP Maroc.
 * Sert de référence pour cadrer les grilles des prestataires.
 */
export interface PrestationCorpus {
  /** Code stable (ex: "PLOMB_INSTAL_WC_COMPLETE"). */
  code: string;
  /** Corps de métier (ex: "plomberie_sanitaire"). */
  corpsMetier: string;
  /** Libellé affiché. */
  label: string;
  /** Description détaillée. */
  description: string;
  /** Unité recommandée par CITURBAREA. */
  uniteRecommandee: TarifUnite;
  /** Borne basse du prix indicatif marché (MAD HT). */
  prixIndicatifMinMAD: number;
  /** Borne haute du prix indicatif marché (MAD HT). */
  prixIndicatifMaxMAD: number;
}

/** Payload de création d'un tarif. */
export interface CreateTarifInput {
  prestataireId: string;
  corpsMetier: string;
  prestation: string;
  unite: TarifUnite;
  prixUnitaireMAD: number;
  conditions: TarifConditions;
  zoneIntervention: string[];
  garanties: TarifGaranties;
  validUntil: string;
  commissionCiturbareaPct?: number;
}

/** Payload de mise à jour partielle. */
export type UpdateTarifInput = Partial<Omit<CreateTarifInput, "prestataireId">>;

/** Résultat du comparateur de prix. */
export interface ComparatorResult {
  prestation: string;
  unite: TarifUnite;
  clientPrice: number;
  marketStats: {
    min: number;
    max: number;
    median: number;
    count: number;
  };
  positionPct: number;
  verdict: "TRES_BAS" | "BAS" | "MARCHE" | "ELEVE" | "TRES_ELEVE";
  badge: string;
}

/** Filtres pour la recherche client. */
export interface SearchTarifsFilters {
  prestation?: string;
  zone?: string;
  maxPrice?: number;
}
