/**
 * analytics-hub.types.ts — Instrumentation des 6 portes (P1-P6).
 *
 * Objectif (validé fondateur) : on garde les 6 portes vivantes, on MESURE
 * laquelle convertit le mieux, et on laisse le marché trancher l'allocation
 * dev/marketing. Pas de "kill" a priori.
 */

export type PorteId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export type AnalyticsEventType =
  | "view"                  // page vue
  | "page_leave"            // quitte une page (meta.durationMs = temps passé sur la page)
  | "wizard_start"          // début wizard
  | "wizard_step"           // passage étape
  | "wizard_complete"       // wizard fini (pas encore soumis)
  | "intake_submit"         // soumission dossier
  | "payment_initiated"     // paiement lancé
  | "payment_received"      // paiement validé
  | "nps_response"          // réponse NPS 0-10
  | "phase_completed";      // jalon dossier franchi

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  porte?: PorteId;
  sessionId: string;
  userId?: string;
  path?: string;
  value?: number;           // ex: montant payé, score NPS
  meta?: Record<string, any>;
  ts: string;               // ISO
}

export interface PorteFunnel {
  porte: PorteId;
  views: number;
  wizardStarts: number;
  wizardCompletes: number;
  intakeSubmits: number;
  paymentsInitiated: number;
  paymentsReceived: number;
  // taux de conversion entre chaque étape (%)
  rateViewToStart: number;
  rateStartToComplete: number;
  rateCompleteToSubmit: number;
  rateSubmitToPaid: number;
  rateGlobalViewToPaid: number;
}

export interface PorteKpi {
  porte: PorteId;
  dau: number;
  mau: number;
  gmvMad: number;            // somme montants payés
  npsScore: number;          // -100..+100
  npsResponses: number;
  arpuMad: number;           // gmv / payeurs uniques
  payeursUniques: number;
  funnel: PorteFunnel;
}

export interface AnalyticsDashboard {
  period: "7d" | "30d" | "90d";
  generatedAt: string;
  totalEvents: number;
  portes: PorteKpi[];
  topPorteByGmv?: PorteId;
  topPorteByConversion?: PorteId;
}

/* ── Suivi des visites (sessions visiteurs, hors funnel) ───────────────────── */

export interface VisitorDay {
  date: string;            // YYYY-MM-DD
  visitors: number;        // sessions uniques actives ce jour
  pageviews: number;       // pages vues ce jour
  avgDurationSec: number;  // durée moyenne des sessions démarrées ce jour
  bounceRate: number;      // % sessions (démarrées ce jour) à une seule page
}

export interface PageStat {
  path: string;
  views: number;
  uniques: number;         // sessions uniques ayant vu cette page
}

export interface VisitorSession {
  sessionId: string;
  userId?: string;
  firstSeen: string;       // ISO
  lastSeen: string;        // ISO — quand le visiteur a quitté
  durationSec: number;
  pageviews: number;
  entryPath?: string;      // page d'entrée
  exitPath?: string;       // page de sortie
  paths: string[];         // parcours
  isLead: boolean;         // a soumis un intake / créé un compte
}

export interface VisitorsReport {
  period: "7d" | "30d" | "90d";
  generatedAt: string;
  totals: {
    visitors: number;
    sessions: number;
    pageviews: number;
    avgDurationSec: number;
    bounceRate: number;
    leads: number;         // sessions ayant converti en lead (intake_submit)
  };
  daily: VisitorDay[];
  topPages: PageStat[];
  topExitPages: PageStat[];
  recentSessions: VisitorSession[];
}
