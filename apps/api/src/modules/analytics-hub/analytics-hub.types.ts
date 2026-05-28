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
