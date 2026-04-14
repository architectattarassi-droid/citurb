/**
 * CITURBAREA — P1 State Machine (Canonical)
 * 
 * Doctrine: Upgrade-only + Append-only + Zero destructive delete
 * 
 * États E1→E12 + EC_GEL
 * Transitions formelles via events
 * Crash volontaire si transition invalide (fail-fast)
 */

// ═══════════════════════════════════════════════════════════════════════════
// STATES
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export type P1Event =
  | { type: "EVT_START" }
  | { type: "EVT_QUAL_SUBMIT"; payload?: { projectType: import("./p1/types").ProjectType; surface: string; budget: string } }
  | { type: "EVT_DOCS_OK" }
  | { type: "EVT_PACK_SELECTED"; payload: { packId: string } }
  | { type: "EVT_DISCLAIMER_ACCEPT" }
  | { type: "EVT_PAYMENT_CONFIRMED"; payload: { stripeSessionId: string } }
  | { type: "EVT_START_PRODUCTION" }
  | { type: "EVT_PRODUCTION_PHASE"; payload: { subPhase: "E8_1_ESQUISSE" | "E8_2_APS" | "E8_3_APD" | "E8_4_AUTO" } }
  | { type: "EVT_AUTH_SUBMITTED" }
  | { type: "EVT_AUTH_SIGNED" }
  | { type: "EVT_SITE_START" }
  | { type: "EVT_SITE_DONE" }
  | { type: "EVT_VALIDATED" }
  | { type: "EVT_ARCHIVED" }
  | { type: "EVT_FREEZE"; payload?: { reason: string } };

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION TABLE (PURE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transition function — PURE (no side effects)
 * 
 * @throws Error if transition is invalid (fail-fast, no permissiveness)
 */
export function transition(state: P1State, event: P1Event): P1State {
  // Global freeze transition (from ANY state)
  if (event.type === "EVT_FREEZE") {
    return "EC_GEL";
  }

  switch (state) {
    case "E1_LANDING":
      if (event.type === "EVT_START") return "E2_QUALIFICATION";
      break;

    case "E2_QUALIFICATION":
      if (event.type === "EVT_QUAL_SUBMIT") return "E3_DOCUMENTS";
      break;

    case "E3_DOCUMENTS":
      if (event.type === "EVT_DOCS_OK") return "E4_PACK";
      break;

    case "E4_PACK":
      if (event.type === "EVT_PACK_SELECTED") return "E5_DISCLAIMER";
      break;

    case "E5_DISCLAIMER":
      if (event.type === "EVT_DISCLAIMER_ACCEPT") return "E6_PAYMENT";
      break;

    case "E6_PAYMENT":
      if (event.type === "EVT_PAYMENT_CONFIRMED") return "E7_ACTIVE";
      break;

    case "E7_ACTIVE":
      if (event.type === "EVT_START_PRODUCTION") return "E8_PRODUCTION";
      break;

    case "E8_PRODUCTION":
      // Sub-phases within E8 (internal state, no transition)
      if (event.type === "EVT_PRODUCTION_PHASE") return "E8_PRODUCTION";
      // Advance to next major phase
      if (event.type === "EVT_AUTH_SUBMITTED") return "E9_AUTORISATION";
      break;

    case "E9_AUTORISATION":
      if (event.type === "EVT_AUTH_SIGNED") return "E10_CHANTIER";
      break;

    case "E10_CHANTIER":
      if (event.type === "EVT_SITE_DONE") return "E11_VALIDATION";
      break;

    case "E11_VALIDATION":
      if (event.type === "EVT_VALIDATED") return "E12_CLOTURE";
      break;

    case "E12_CLOTURE":
      // Terminal state (can only freeze)
      if (event.type === "EVT_ARCHIVED") return "E12_CLOTURE"; // Idempotent
      break;

    case "EC_GEL":
      // Frozen state — no transitions allowed
      throw new Error(`Dossier frozen (EC_GEL). No transitions permitted.`);
  }

  // If we reach here, transition is invalid
  throw new Error(
    `Invalid transition from "${state}" via "${event.type}". ` +
    `Doctrine violation: transitions must be explicit and validated.`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDS (Validation rules)
// ═══════════════════════════════════════════════════════════════════════════

export function canTransition(state: P1State, event: P1Event): boolean {
  try {
    transition(state, event);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// METADATA (for tooling/debugging)
// ═══════════════════════════════════════════════════════════════════════════

export const P1_STATE_LABELS: Record<P1State, string> = {
  E1_LANDING: "Landing",
  E2_QUALIFICATION: "Qualification",
  E3_DOCUMENTS: "Documents",
  E4_PACK: "Sélection Pack",
  E5_DISCLAIMER: "Conditions",
  E6_PAYMENT: "Paiement",
  E7_ACTIVE: "Actif",
  E8_PRODUCTION: "Production",
  E9_AUTORISATION: "Autorisation",
  E10_CHANTIER: "Chantier",
  E11_VALIDATION: "Validation",
  E12_CLOTURE: "Clôturé",
  EC_GEL: "Gelé",
};

export const P1_EVENT_LABELS: Record<P1Event["type"], string> = {
  EVT_START: "Démarrer",
  EVT_QUAL_SUBMIT: "Soumettre qualification",
  EVT_DOCS_OK: "Documents validés",
  EVT_PACK_SELECTED: "Pack sélectionné",
  EVT_DISCLAIMER_ACCEPT: "Conditions acceptées",
  EVT_PAYMENT_CONFIRMED: "Paiement confirmé",
  EVT_START_PRODUCTION: "Démarrer production",
  EVT_PRODUCTION_PHASE: "Avancer phase production",
  EVT_AUTH_SUBMITTED: "Autorisation déposée",
  EVT_AUTH_SIGNED: "Autorisation signée",
  EVT_SITE_START: "Chantier démarré",
  EVT_SITE_DONE: "Chantier terminé",
  EVT_VALIDATED: "Validé",
  EVT_ARCHIVED: "Archivé",
  EVT_FREEZE: "Geler",
};
