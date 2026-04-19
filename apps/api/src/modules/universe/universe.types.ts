export type FacadeCount = 2 | 3 | 4;
export type LotType = "ECO" | "STANDARD";
export type ProjectType = "MAISON_VILLE" | "VILLA_ISOLEE" | "VILLA_JUMELEE";

export type CourType = "NONE" | "SMALL" | "MEDIUM" | "LARGE";
export type EncType = "NONE" | "LIGHT" | "HEAVY";

export interface PlanSeed {
  id: string;
  projectType: ProjectType;
  facades: FacadeCount;
  lotType: LotType;
  levels: number; // total levels above ground (RDC=1)
  hasBasement: boolean;
  cour: CourType;
  encorbellement: EncType;

  // computed
  maxRdcRatio: number;
  maxFloorRatio: number;
  maxBuiltRatio: number;
  notes: string[];
}

export interface UniverseQuery {
  projectType?: ProjectType;
  facades?: FacadeCount;
  lotType?: LotType;
  levels?: number;
  hasBasement?: boolean;
  cour?: CourType;
  encorbellement?: EncType;

  page?: number;
  pageSize?: number;
  sort?: string; // "projectType" | "levels" | "maxBuiltRatio" etc
  order?: "asc" | "desc";
}
