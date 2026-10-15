/**
 * Types du module Devis & Facturation
 * (docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md §1).
 * Montants, surfaces et pourcentages circulent en chaînes décimales
 * (« 11542.50 ») : aucun flottant n'entre dans un calcul (voir decimal.ts).
 */

export type Typologie = "MAISON_INDIVIDUELLE" | "IMMEUBLE" | "VILLA" | "LOCAL_COMMERCIAL" | "AMENAGEMENT_INTERIEUR";
export type CodeNiveau = "SOUS_SOL" | "RDC" | "ETAGE" | "TERRASSE" | "MEZZANINE";
export type UsageNiveau = "HABITATION" | "COMMERCIAL" | "PARKING" | "TECHNIQUE";
export type ModeTarification = "POURCENTAGE_HONORAIRES" | "POURCENTAGE_TRAVAUX" | "FORFAIT" | "UNITAIRE";
export type Unite = "VISITE" | "ETAGE" | "PIECE" | "M2";
export type Caractere = "OBLIGATOIRE" | "FACULTATIVE" | "RECOMMANDEE" | "SUR_DEMANDE";
export type Intervenant = "ARCHITECTE" | "BUREAU_ETUDES" | "LABORATOIRE" | "GEOMETRE";
export type Groupe = "A_HONORAIRES_OBLIGATOIRES" | "B_TECHNIQUE_OBLIGATOIRE" | "C_FACULTATIF" | "D_SUR_DEMANDE";
export type TypeDevis = "MISSION_COMPLETE" | "MISSION_PARTIELLE" | "COMPLEMENTAIRE";
export type Presentation = "DETAILLEE" | "PACKS";
export type ModalitePaiement = "AVANCE_TOTALE" | "50_50" | "PAR_TRANCHES" | "PAR_VISITE";
export type StatutDevis = "BROUILLON" | "EMIS" | "ACCEPTE" | "FACTURE" | "REFUSE" | "EXPIRE";
export type TypeFacture = "ACOMPTE" | "SITUATION" | "SOLDE" | "FORFAIT_UNIQUE" | "AVOIR";
export type StatutFacture = "BROUILLON" | "EMISE" | "PARTIELLEMENT_REGLEE" | "REGLEE" | "ANNULEE";
export type ModeEncaissement = "ESPECES" | "CHEQUE" | "VIREMENT" | "EFFET";

/** Domaine où un forfait est valable (§1.6) ; hors domaine → « Sur devis » (règle 3). */
export interface DomaineValidite {
  typologies?: Typologie[];
  surfacePlancherMax?: string;
  niveauxMax?: number;
  sousSol?: boolean;
}

export interface Prestation {
  code: string;
  libelle: string;
  /** Ligne en italique sous le titre. `{commune}` est remplacé par la commune d'instruction (règle 7). */
  descriptif: string;
  modeTarification: ModeTarification;
  /** % (quote-part) ou DH (forfait, prix unitaire). null = pas encore tarifé → « Sur devis ». */
  valeur: string | null;
  unite?: Unite;
  caractere: Caractere;
  intervenant: Intervenant;
  horsHonoraires: boolean;
  actif: boolean;
  domaineValidite?: DomaineValidite;
  /** Mention restrictive affichée en rouge dans la ligne même (§4, §5.5). */
  mentionRestrictive?: string;
  /** Famille du catalogue (§3). */
  famille: "HONORAIRES" | "HORS_HONORAIRES" | "FORFAIT_ADMINISTRATIF";
}

export interface DefinitionPack {
  code: "ESSENTIEL" | "PERSONNALISE" | "PREMIUM";
  libelle: string;
  prestations: string[];
  mentionRestrictive?: string;
}

export interface GrilleTarifaire {
  id: string;
  cabinetId: string;
  version: string;
  dateEffet: string;
  /** Assiette des honoraires : % du coût prévisionnel des travaux (5). */
  tauxHonoraires: string;
  puFondations: string;
  /** PU d'élévation proposé par défaut (DH/m² de plancher), modifiable par projet. */
  puElevationParTypologie: Partial<Record<Typologie, string>>;
  prestations: Prestation[];
  packs: DefinitionPack[];
}
