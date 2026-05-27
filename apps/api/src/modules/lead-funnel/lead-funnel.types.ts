/**
 * lead-funnel.types.ts
 *
 * Types et contrats du module LEAD FUNNEL (Tome 0 — capture & qualification).
 *
 * Stratégie de persistence (MVP) :
 *  - Pas de migration Prisma immédiate (cf. INTEGRATION.md pour le modèle
 *    Lead à ajouter ultérieurement).
 *  - Fallback : Map en mémoire + dump JSON best-effort dans `data/leads.json`
 *    (idempotent, survit aux redémarrages dev). Production : remplacer par
 *    Prisma dès que le modèle est appliqué.
 */

export type PorteType = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "AUTRE";

export type LeadSource =
  | "WEB_HERO"
  | "WEB_PORTE_SEO"
  | "WEB_ROI_CALC"
  | "WEB_WHATSAPP_CTA"
  | "WEB_NEWSLETTER"
  | "PARTENAIRE"
  | "WHATSAPP_INBOUND"
  | "REFERRAL"
  | "DIRECT"
  | "AUTRE";

export type LeadStage =
  | "NEW"             // Capturé, pas encore contacté
  | "CONTACTED"       // Email/SMS J+0 envoyé
  | "QUALIFIED"       // A répondu, scoring > 60
  | "WIZARD_STARTED"  // A commencé un wizard P1-P5
  | "DOSSIER_OPENED"  // Dossier créé (intake terminé)
  | "PAID"            // Pack payé → converti
  | "LOST"            // Abandonné / refusé
  | "ARCHIVED";       // Plus de relances

export type Channel = "EMAIL" | "SMS" | "WHATSAPP" | "CALL";

/** Entrée du formulaire public de capture lead (3 champs minimum). */
export interface LeadCaptureInput {
  nom: string;
  telephone: string;
  email?: string;
  projetType?: PorteType | string;
  budget?: number;           // MAD
  ville?: string;
  surface?: number;          // m² (si pré-rempli par calculateur)
  delaiMois?: number;        // < 6 = projet immédiat
  source?: LeadSource;
  lang?: "fr" | "ar" | "en";
  meta?: Record<string, unknown>;
  pageContext?: string;      // URL / slug de la page qui a capturé
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

/** Évènement journalisé sur un lead (visite, email envoyé, réponse, etc.). */
export interface LeadEvent {
  id: string;
  at: string;           // ISO date
  kind:
    | "CREATED"
    | "SCORED"
    | "EMAIL_SENT"
    | "EMAIL_OPENED"
    | "EMAIL_REPLIED"
    | "SMS_SENT"
    | "WA_INBOUND"
    | "WIZARD_PROGRESS"
    | "DOSSIER_CONVERTED"
    | "STAGE_CHANGE"
    | "NOTE";
  channel?: Channel;
  payload?: Record<string, unknown>;
}

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  nom: string;
  telephone: string;
  email?: string;
  projetType?: PorteType | string;
  budget?: number;
  ville?: string;
  surface?: number;
  delaiMois?: number;
  source: LeadSource;
  lang: "fr" | "ar" | "en";
  pageContext?: string;
  utm?: LeadCaptureInput["utm"];
  /** Score 0–100 (cf. lead-scoring.ts). */
  score: number;
  scoreBreakdown?: Record<string, number>;
  stage: LeadStage;
  wizardStep?: number;        // 0..N (renseigné si wizard commencé)
  returnVisitor?: boolean;
  /** Horodatage de la dernière relance émise (par template). */
  nurtureLog?: Record<string, string>;
  /** Si un dossier a été créé à partir du lead. */
  convertedDossierId?: string | null;
  events: LeadEvent[];
  meta?: Record<string, unknown>;
}

/** Sortie publique d'un capture (pas de PII complète). */
export interface LeadCaptureResult {
  leadId: string;
  scoreInitial: number;
  stage: LeadStage;
  message: string;
}

/** Sortie pour /funnel-stats (consommée par /cc/dashboard). */
export interface FunnelStats {
  total: number;
  byStage: Record<LeadStage, number>;
  byPorte: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: number;          // PAID / total
  avgScore: number;
  last7d: number;
  last30d: number;
}
