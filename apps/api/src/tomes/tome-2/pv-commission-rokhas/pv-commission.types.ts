/**
 * Tome 2 — PV Commission Rokhas — Types
 *
 * Modélise un PV (procès-verbal) de commission Rokhas (rokhas.ma) :
 * compte-rendu officiel d'une commission communale qui statue sur un
 * permis de construire. Acte les décisions et les réserves à lever.
 */

export type DecisionCommission =
  | "FAVORABLE"
  | "FAVORABLE_AVEC_RESERVES"
  | "DEFAVORABLE"
  | "AJOURNE";

export type PvStatus =
  | "UPLOADED" // PDF reçu, pas encore parsé
  | "PARSING" // extraction en cours
  | "PARSED" // structuré, prêt
  | "VALIDATED" // validé par architecte/OPS
  | "ARCHIVED";

export type ReserveSeverite = "MINEURE" | "MAJEURE" | "BLOQUANTE";

export type ReserveStatus =
  | "OUVERTE"
  | "EN_COURS"
  | "LEVEE"
  | "FORCLOSE"; // délai dépassé

export interface PvMotifRefus {
  titre: string;
  articleLoi?: string;
  description: string;
}

export interface PvReserveInput {
  ordre: number;
  titre: string;
  description: string;
  articleLoi?: string;
  severite?: ReserveSeverite;
  deadlineLevee?: string | Date | null;
}

export interface ParsedPv {
  rokhasReference?: string;
  numDossier?: string;
  dateCommission?: string | null;
  communeName?: string;
  presents?: string[];
  decision: DecisionCommission;
  motifsRefus: PvMotifRefus[];
  reserves: PvReserveInput[];
  delaiLegalReponseDays: number;
  rawText: string;
  parserVersion: string;
  parsingConfidence: number; // 0..1
}

export interface PvCommissionRokhasView {
  id: string;
  dossierId: string;
  rokhasReference: string | null;
  uploadedFileUrl: string;
  uploadedAt: string;
  parsedAt: string | null;
  parsedBy: string | null;
  dateCommission: string | null;
  communeName: string | null;
  presents: string[];
  decision: DecisionCommission | null;
  motifsRefus: PvMotifRefus[];
  reserves: PvCommissionReserveView[];
  delaiLegalReponseDays: number;
  status: PvStatus;
  hashSha256: string;
  parserVersion: string | null;
  parsingConfidence: number | null;
}

export interface PvCommissionReserveView {
  id: string;
  ordre: number;
  titre: string;
  description: string;
  articleLoi: string | null;
  severite: ReserveSeverite;
  deadlineLevee: string | null;
  status: ReserveStatus;
  preuveUrl: string | null;
  leveeAt: string | null;
  leveeBy: string | null;
  joursRestants: number | null;
}

export interface WorkflowOutcome {
  decision: DecisionCommission;
  actionsTriggered: string[];
  notifications: number;
  tasksCreated: number;
  incidentId?: string;
}
