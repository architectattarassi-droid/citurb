/**
 * mre-diaspora.types.ts — Types du module MRE Diaspora (Pivot Visa du foncier).
 *
 * Adresse les 4M Marocains résidents à l'étranger (115 Mrd MAD/an remittances,
 * dont ~35 Mrd MAD/an vers l'immobilier). Permet d'investir/hériter/construire
 * au Maroc 100% à distance via mandataire local agréé + procuration eIDAS + escrow.
 */

/** Pays de résidence MRE supportés (ISO-3166-1 alpha-3). */
export type MreCountry =
  | "CAN" | "FRA" | "BEL" | "ESP" | "DEU" | "NLD" | "ITA"
  | "GBR" | "USA" | "ARE" | "SAU" | "QAT";

/** Type de mission confiée à un mandataire local. */
export type MissionType =
  | "SUCCESSION"            // règlement héritage + partage indivision
  | "ACHAT_IMMOBILIER"     // achat bien à distance
  | "VENTE_IMMOBILIER"     // vente bien
  | "CONSTRUCTION"          // supervision projet construction
  | "GESTION_LOCATIVE"     // gestion location à distance
  | "DEMARCHE_ANCFCC"      // immatriculation / morcellement
  | "PROCURATION"           // mandat général
  | "CONTENTIEUX";          // litige foncier

/** Statut d'une procuration eIDAS. */
export type ProcurationStatus =
  | "DRAFT"                 // brouillon
  | "PENDING_SIGNATURE"    // en attente signature MRE
  | "SIGNED"                // signée par le MRE depuis l'étranger
  | "APOSTILLE_REQUESTED"  // Apostille La Haye demandée
  | "APOSTILLE_DONE"       // légalisée (opposable au MA)
  | "EXECUTED"              // mission exécutée
  | "REVOKED";

/** Statut compte escrow. */
export type EscrowMilestoneStatus = "PENDING" | "FUNDED" | "RELEASED" | "DISPUTED" | "REFUNDED";

export interface MreProfile {
  userId: string;
  countryResidence: MreCountry;
  city?: string;
  passportMaNumber?: string;       // n° passeport marocain
  consulateAttestationDocId?: string;
  cinMaNumber?: string;            // CIN si conservée
  preferredLang: "fr" | "ar" | "en";
  certifiedAt?: string;            // ISO date certification MRE
}

export interface ProcurationScope {
  code: string;                    // ex: "DEPOT_DOSSIER_ANCFCC"
  label: string;
  labelAr: string;
}

export interface Procuration {
  id: string;
  dossierId: string;
  mreUserId: string;
  mandataireId: string;
  mandataireNom?: string;
  missionType: MissionType;
  scopes: string[];                // codes ProcurationScope
  dureeJours: number;
  status: ProcurationStatus;
  htmlContent?: string;
  hashSha256?: string;
  signatureDataUrl?: string;
  signedFromCountry?: MreCountry;
  signedAt?: string;
  apostilleRef?: string;
  apostilleAt?: string;
  createdAt: string;
}

export interface EscrowMilestone {
  id: string;
  label: string;
  amountMad: number;
  status: EscrowMilestoneStatus;
  conditionDescription: string;
  fundedAt?: string;
  releasedAt?: string;
  preuveDocIds?: string[];
}

export interface EscrowAccount {
  dossierId: string;
  mreUserId: string;
  totalMad: number;
  fundedMad: number;
  releasedMad: number;
  milestones: EscrowMilestone[];
  bankPartner: string;             // "Bank Al-Maghrib (séquestre)" pour MVP
  createdAt: string;
}

export interface DiasporaDashboard {
  profile: MreProfile | null;
  procurations: Procuration[];
  escrowAccounts: EscrowAccount[];
  activeDossiers: { dossierId: string; title: string; phase: string }[];
  stats: {
    procurationsActives: number;
    escrowTotalMad: number;
    escrowReleasedMad: number;
    missionsEnCours: number;
  };
}
