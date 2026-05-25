/**
 * Project Calendar — types canoniques
 *
 * Storage: Dossier.payload.projectCalendar.tasks[] (pattern packValidation,
 * pas de migration Prisma nécessaire pour le MVP). Voir INTEGRATION.md
 * pour le modèle Prisma cible.
 *
 * Tome: T6 (workflows dossiers, planning, orchestration projet).
 */

export type ProjectPhase =
  | "ESQ"
  | "APS"
  | "APD"
  | "DCE"
  | "DAO"
  | "MARCHE"
  | "EXEC"
  | "RECEPTION"
  | "GPA";

export type ProjectTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "CANCELED";

export type ProjectTaskBlocker = {
  type: string; // e.g. "WAITING_VALIDATION", "MISSING_DOC"
  payload?: Record<string, unknown>;
  since: string; // ISO
};

export type ProjectTask = {
  id: string;
  dossierId: string;
  parentId?: string | null;

  /** Code WBS hiérarchique, ex "1.2.3". Généré à la création. */
  numero: string;

  titre: string;
  description?: string | null;

  phase: ProjectPhase;

  /** ISO date au format YYYY-MM-DD (ou ISO complet). */
  startAt?: string | null;
  endAt?: string | null;
  durationDays: number;

  /** 0..100 */
  progressPct: number;

  isMilestone: boolean;
  /** Calculé par CPM, n'est jamais écrit depuis l'UI. */
  isCritical: boolean;

  /** IDs des tâches prédécesseurs (FS, finish-to-start). */
  predecessors: string[];

  /** Optionnels — assignation. */
  resourceUserIds: string[];
  resourceSupplierIds: string[];

  status: ProjectTaskStatus;
  blockers: ProjectTaskBlocker[];

  createdAt: string;
  updatedAt: string;
};

export type CpmResult = {
  /** Liste ordonnée des taskIds sur le chemin critique. */
  criticalPath: string[];
  /** Durée totale projet en jours (= endAt max sur tâches critiques). */
  projectDuration: number;
  /** taskId → slack en jours (latestStart - earliestStart). */
  slackPerTask: Record<string, number>;
  /** Détails par tâche : earliest/latest start/finish. */
  schedule: Record<
    string,
    {
      earliestStart: number;
      earliestFinish: number;
      latestStart: number;
      latestFinish: number;
      slack: number;
      isCritical: boolean;
    }
  >;
};

export type GanttBar = {
  taskId: string;
  numero: string;
  titre: string;
  phase: ProjectPhase;
  startDay: number; // offset jours depuis t0
  endDay: number;
  durationDays: number;
  progressPct: number;
  isCritical: boolean;
  isMilestone: boolean;
  status: ProjectTaskStatus;
  predecessors: string[];
};

export type GanttPayload = {
  projectStart: string | null; // ISO date
  projectEnd: string | null;
  projectDuration: number;
  bars: GanttBar[];
  phases: { phase: ProjectPhase; startDay: number; endDay: number; count: number }[];
};

export type CreateTaskDto = {
  titre: string;
  phase: ProjectPhase;
  durationDays: number;
  description?: string;
  parentId?: string | null;
  predecessors?: string[];
  resourceUserIds?: string[];
  resourceSupplierIds?: string[];
  isMilestone?: boolean;
  startAt?: string | null;
  status?: ProjectTaskStatus;
};

export type PatchTaskDto = Partial<
  Omit<CreateTaskDto, "phase"> & {
    phase: ProjectPhase;
    progressPct: number;
    endAt: string | null;
    blockers: ProjectTaskBlocker[];
  }
>;

export type ProjectCalendarState = {
  tasks: ProjectTask[];
  /** Date de référence (t0) du planning, ISO YYYY-MM-DD. */
  projectStart?: string | null;
  /** Dernier calcul CPM caché. */
  lastCpm?: CpmResult;
  lastCpmAt?: string;
};
