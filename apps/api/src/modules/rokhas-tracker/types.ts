/**
 * Rokhas Tracker — Types
 *
 * Suivi visuel temps réel de l'instruction d'un permis de construire
 * dans le circuit Rokhas (rokhas.ma / commune).
 *
 * Distinction avec `pv-commission-rokhas` :
 *  - `pv-commission-rokhas` : parsing d'un PV (compte-rendu officiel)
 *    une fois la commission tenue, avec extraction de réserves.
 *  - `rokhas-tracker` (ici)  : tracker de jalons d'instruction depuis le
 *    dépôt jusqu'à la délivrance, calcul des deadlines légales (décret
 *    2-13-424), countdown client, vue timeline.
 *
 * Le tracker peut consommer un PV existant pour matérialiser
 * l'événement `DECISION` (cf. service.acceptPvDecision).
 */

/** Catégories de projet selon décret 2-13-424 (instruction permis). */
export type ProjectCategory = 1 | 2 | 3;

/** Type d'événement timeline. */
export type RokhasEventType =
  | "DEPOT"
  | "ACCUSE"
  | "COMMISSION"
  | "AVIS_AU"
  | "AVIS_SERVICES"
  | "VOTE"
  | "DECISION"
  | "RESERVE_AJOUTE"
  | "RESERVE_LEVEE"
  | "DELIVRANCE";

export type RokhasDecisionType =
  | "FAVORABLE"
  | "FAVORABLE_AVEC_RESERVES"
  | "DEFAVORABLE"
  | "AJOURNE";

export type ReserveSeverite = "INFO" | "AVIS" | "RESERVE" | "BLOQUANT";

export type ReserveStatus = "OUVERTE" | "EN_COURS" | "LEVEE" | "FORCLOSE";

export interface RokhasEvent {
  id: string;
  type: RokhasEventType;
  /** ISO date string */
  date: string;
  /** ISO created-at (peut différer de la date métier) */
  createdAt: string;
  payload?: Record<string, any>;
  /** Auteur (userId, "system:webhook", "system:cron"…) */
  by?: string;
}

export interface RokhasDecision {
  type: RokhasDecisionType;
  date: string;
  motifsRefus?: Array<{ titre: string; articleLoi?: string; description: string }>;
  /** N° du PV source si décision matérialisée par PV uploadé. */
  pvId?: string;
}

export interface RokhasReserve {
  id: string;
  titre: string;
  description: string;
  articleLoi: string | null;
  severite: ReserveSeverite;
  /** ISO — calculé par défaut à decisionDate + 60j (délai légal levée). */
  deadlineLevee: string | null;
  status: ReserveStatus;
  preuveDocId: string | null;
  preuveUrl: string | null;
  leveeAt: string | null;
  leveeBy: string | null;
  /** Calculé à la lecture, jamais persisté. */
  joursRestants?: number | null;
}

export interface RokhasInstance {
  dossierId: string;
  projectCategory: ProjectCategory;
  /** ISO — date officielle du dépôt en commune. */
  depositDate: string;
  refRokhasCommune: string | null;
  events: RokhasEvent[];
  decision: RokhasDecision | null;
  reserves: RokhasReserve[];
  delivranceDate: string | null;
  attestationPdfUrl: string | null;
  /** ISO — last touch (any event). */
  updatedAt: string;
}

/** Deadline active retournée par /deadlines. */
export interface RokhasDeadline {
  type: "DECISION_LEGALE" | "RESERVE_LEVEE" | "RELANCE_AJOURNE";
  label: string;
  /** ISO */
  deadline: string;
  joursRestants: number | null;
  severity: "OK" | "WARN" | "CRITICAL" | "OVERDUE";
  /** id de la réserve si type === RESERVE_LEVEE */
  reserveId?: string;
}

/** Réponse hydratée enrichie (pour le front). */
export interface RokhasInstanceView extends RokhasInstance {
  deadlines: RokhasDeadline[];
  /**
   * Compteur principal — deadline légale de la décision (par catégorie),
   * ou null si déjà décidé.
   */
  decisionDeadline: { deadline: string; joursRestants: number; severity: RokhasDeadline["severity"] } | null;
  /** % d'avancement [0..100] dérivé du nombre de jalons franchis. */
  progressPct: number;
}
