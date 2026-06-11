/**
 * Domain P1 - Types unifiés
 * Source unique de vérité pour tous les types P1
 */

export type ProjectType = 'villa' | 'immeuble' | 'renovation' | 'ferme_urbaine';
export type PlanMode = 'type' | 'perso';
export type VillaType = 'bande' | 'jumelee' | 'isolee';
export type ImmeubleLevel = 'R+1' | 'R+2' | 'R+3' | 'R+4';
export type VillaLevel = 'R+0' | 'R+1' | 'R+2' | 'R+3';
/** RDC cour mode pour immeuble 1 façade (mitoyen 2 côtés) */
export type RdcCourMode = 'with_cour' | 'without_cour' | 'unknown';
/** Galerie RDC commercial (recul obligatoire = CES 0.7, sinon CES 1.0) */
export type GalerieMode = 'yes' | 'no';
/** Ferme urbaine : mode rapide (2% terrain) ou libre (surface saisie) */
export type FermeUrbaineMode = 'rapide' | 'libre';

export interface ContactData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export interface ProjectLocation {
  region: string;
  province: string;
  commune: string;
}

export interface VillaDetails extends ProjectLocation {
  type: 'villa';
  villaType: VillaType;
  area: number;
  budget: number;
  timeline: string;
  facades?: number;
}

export interface ImmeubleDetails extends ProjectLocation {
  type: 'immeuble';
  niveau: ImmeubleLevel;
  typeLot: string;
  area: number;
  budget: number;
  timeline: string;
}

export interface RenovationDetails extends ProjectLocation {
  type: 'renovation';
  description: string;
  area?: number;
  budget: number;
  timeline: string;
}

export type ProjectDetails = VillaDetails | ImmeubleDetails | RenovationDetails;

export interface P1Draft {
  projectType: ProjectType | null;
  planMode: PlanMode | null;
  contactData: ContactData | null;
  projectDetails: ProjectDetails | null;
}

export interface P1Case {
  id: string;
  projectType: ProjectType;
  planMode: PlanMode;
  contactData: ContactData;
  projectDetails: ProjectDetails;
  selectedPack: string | null;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'pending_otp' | 'pending_email' | 'active' | 'completed';
}

/** Alias used by validation.ts */
export type VillaSubtype = 'bande' | 'jumelee' | 'isolee';

/** Flat draft shape persisted by P1Landing tunnel. Extensible. */
export interface P1ProjectData {
  projectType?: ProjectType;
  planMode?: PlanMode | 'personnalise' | 'qualification';
  createdAt?: number;
  type?: 'villa' | 'immeuble' | 'renovation' | 'ferme_urbaine';
  villaType?: string;
  villaSubtype?: VillaSubtype;
  immeubleType?: string;
  rLevel?: string;
  facades?: number;
  renoKind?: 'renovation' | 'decoration' | 'transformation';
  renoBaseType?: 'villa' | 'immeuble';
  firstname?: string;
  lastname?: string;
  phone?: string;
  email?: string;
  personType?: string;
  legalSituation?: string;
  physIdType?: string;
  physIdNumber?: string;
  companyName?: string;
  companyForm?: string;
  companyICE?: string;
  companyRC?: string;
  region?: string;
  province?: string;
  commune?: string;
  city?: string;
  terrainArea?: number;
  surface?: number;
  area?: number;
  m2?: number;
  budget?: string | number;
  budgetBandId?: string;
  budgetMinMAD?: number;
  budgetMaxMAD?: number;
  budgetLabel?: string;
  horizon?: string;
  ownerStatus?: string;
  tfStatus?: string;
  tfNumber?: string;
  lotStatus?: string;
  lotName?: string;
  lotNumber?: string;
  hasBasement?: boolean;
  basement?: string;
  commercialGroundFloor?: boolean;
  rdcCommercial?: string;
  // ── Nouveaux champs SP v2 (2026-06) ─────────────────────────────────
  /** Largeur de la voie devant le projet (m). ≥12m → coef étage 1.1, sinon 1.0 */
  voieLargeur?: number;
  /** Pour immeuble 1 façade : RDC avec cour / sans cour / je ne sais pas */
  rdcCourMode?: RdcCourMode;
  /** Surface de la cour au RDC saisie par l'user (m²) — utilisée si rdcCourMode='with_cour' */
  courSurface?: number;
  /** Galerie pour RDC commercial (impacte CES : avec=0.7, sans=1.0) */
  galerieRdc?: GalerieMode;
  /** Pour ferme urbaine : mode rapide (2% terrain) ou libre */
  fermeMode?: FermeUrbaineMode;
  /** Surface bâtie souhaitée en mode libre ferme urbaine (m²) */
  fermeSurface?: number;
  /** Surface terrain ferme urbaine en hectares (alternative à terrainArea m²) */
  fermeHectares?: number;
  [k: string]: any;
}
