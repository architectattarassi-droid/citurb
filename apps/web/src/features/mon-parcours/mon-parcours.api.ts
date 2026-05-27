/**
 * mon-parcours.api.ts — client REST typé pour l'agrégat "Mon Parcours".
 *
 * Endpoint GET /api/dossier-overview/:dossierId (JWT).
 * Réutilise apiFetch (Tome 4) pour la gestion JWT + erreurs.
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

export type ParcoursPhaseId = "lead" | "manage" | "permit" | "site" | "delivery";
export type PhaseStatus = "PENDING" | "ACTIVE" | "DONE" | "BLOCKED";
export type ActionSeverity = "info" | "warning" | "urgent";

export type NextAction = {
  title: string;
  description: string;
  ctaUrl: string;
  ctaLabel: string;
  deadline: string | null;
  severity: ActionSeverity;
};

export type PhaseSummary = {
  id: ParcoursPhaseId;
  status: PhaseStatus;
  completedAt: string | null;
  summary: Record<string, unknown>;
};

export type ScheduleItem = {
  jalon: string;
  amount: number;
  dueDate: string | null;
  paid: boolean;
  paidAt?: string | null;
};

export type PaymentsBlock = {
  totalContractMAD: number;
  paidMAD: number;
  dueMAD: number;
  currency: "MAD";
  schedule: ScheduleItem[];
};

export type DocumentRef = {
  id: string;
  title: string;
  kind: string;
  signedUrl: string | null;
  signed: boolean;
  updatedAt: string | null;
};

export type ExpertContact = {
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
};

export type DossierOverview = {
  dossierId: string;
  projectTitle: string;
  porteType: string;
  currentPhase: ParcoursPhaseId;
  progressGlobalPct: number;
  nextAction: NextAction | null;
  phases: PhaseSummary[];
  payments: PaymentsBlock;
  documents: DocumentRef[];
  experts: ExpertContact[];
  generatedAt: string;
};

export const monParcoursApi = {
  /** Lit l'agrégat complet pour un dossier. */
  get(dossierId: string) {
    return apiFetch<{ ok: true; overview: DossierOverview }>(
      `/api/dossier-overview/${dossierId}`,
    ).then((r) => r.overview);
  },
};

/** Labels FR par défaut (utilisés si la clé i18n manque). */
export const PHASE_LABELS_FR: Record<ParcoursPhaseId, string> = {
  lead: "Lead",
  manage: "Manage",
  permit: "Permis",
  site: "Chantier",
  delivery: "Réception",
};

/** Couleurs Tailwind par status (palette navy/or CITURBAREA). */
export const PHASE_STATUS_STYLE: Record<
  PhaseStatus,
  { bg: string; text: string; ring: string; dot: string }
> = {
  DONE: {
    bg: "bg-slate-800",
    text: "text-slate-50",
    ring: "ring-slate-800",
    dot: "bg-slate-700",
  },
  ACTIVE: {
    bg: "bg-gradient-to-r from-amber-400 to-amber-500",
    text: "text-slate-900",
    ring: "ring-amber-400",
    dot: "bg-amber-400",
  },
  PENDING: {
    bg: "bg-slate-200",
    text: "text-slate-500",
    ring: "ring-slate-200",
    dot: "bg-slate-300",
  },
  BLOCKED: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    ring: "ring-rose-300",
    dot: "bg-rose-500",
  },
};

export const SEVERITY_STYLE: Record<
  ActionSeverity,
  { bg: string; text: string; border: string }
> = {
  info: { bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-300" },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-300",
  },
  urgent: {
    bg: "bg-gradient-to-r from-amber-400 to-amber-500",
    text: "text-slate-900",
    border: "border-amber-600",
  },
};
