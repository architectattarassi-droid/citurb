/**
 * dossier-overview/types.ts
 *
 * Types partagés (back/front) du parcours client unifié.
 * Cf. INTEGRATION.md pour l'allow-list MutationGate et i18n.
 */

export type ParcoursPhaseId = "lead" | "manage" | "permit" | "site" | "delivery";

export type PhaseStatus =
  | "PENDING"   // pas encore commencé
  | "ACTIVE"   // phase courante
  | "DONE"     // terminée
  | "BLOCKED"; // bloquée (réserve, paiement, etc.)

export type ActionSeverity = "info" | "warning" | "urgent";

export type NextAction = {
  /** Titre court visible immédiatement. */
  title: string;
  /** Sous-texte explicatif. */
  description: string;
  /** Lien de l'action (relative path). */
  ctaUrl: string;
  /** Libellé du bouton CTA. */
  ctaLabel: string;
  /** Échéance ISO (si applicable). */
  deadline: string | null;
  severity: ActionSeverity;
};

export type PhaseSummary = {
  id: ParcoursPhaseId;
  status: PhaseStatus;
  completedAt: string | null;
  /** Champs spécifiques par phase, structure libre côté UI. */
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
  /** ISO date — calculé côté serveur, sert au cache front. */
  generatedAt: string;
};
