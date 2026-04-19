/**
 * CITURBAREA V150 — P1 Types (Shared Frontend/Backend)
 */

export type P1State =
  | "E1_LANDING"
  | "E2_QUALIFICATION"
  | "E3_DOCUMENTS"
  | "E4_PACK"
  | "E5_DISCLAIMER"
  | "E6_PAYMENT"
  | "E7_ACTIVE"
  | "E8_PRODUCTION"
  | "E9_AUTORISATION"
  | "E10_CHANTIER"
  | "E11_VALIDATION"
  | "E12_CLOTURE"
  | "EC_GEL";

export type P1Event =
  | { type: "EVT_START" }
  | { type: "EVT_QUAL_SUBMIT"; payload?: { projectType: string; surface: string; budget: string } }
  | { type: "EVT_DOCS_OK" }
  | { type: "EVT_PACK_SELECTED"; payload: { packId: string } }
  | { type: "EVT_DISCLAIMER_ACCEPT" }
  | { type: "EVT_PAYMENT_CONFIRMED"; payload: { stripeSessionId: string } }
  | { type: "EVT_START_PRODUCTION" }
  | { type: "EVT_PRODUCTION_PHASE"; payload: { subPhase: string } }
  | { type: "EVT_AUTH_SUBMITTED" }
  | { type: "EVT_AUTH_SIGNED" }
  | { type: "EVT_SITE_START" }
  | { type: "EVT_SITE_DONE" }
  | { type: "EVT_VALIDATED" }
  | { type: "EVT_ARCHIVED" }
  | { type: "EVT_FREEZE"; payload?: { reason: string } };
