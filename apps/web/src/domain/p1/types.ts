/**
 * Domain P1 - Types unifiés
 * Source unique de vérité pour tous les types P1
 */

export type ProjectType = 'villa' | 'immeuble' | 'renovation';
export type PlanMode = 'type' | 'perso';
export type VillaType = 'bande' | 'jumelee' | 'isolee';
export type ImmeubleLevel = 'R+1' | 'R+2' | 'R+3' | 'R+4';

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
  type?: 'villa' | 'immeuble' | 'renovation';
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
  [k: string]: any;
}
