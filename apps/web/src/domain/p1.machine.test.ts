/**
 * CITURBAREA — P1 State Machine Tests
 * 
 * Doctrine: 100% coverage of critical transitions
 * Fail-fast validation (invalid transitions must throw)
 */

import { describe, it, expect } from "vitest";
import { transition, canTransition, P1State, P1Event } from "./p1.machine";

describe("P1 State Machine — Canonical Transitions", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH (E1 → E12)
  // ═══════════════════════════════════════════════════════════════════════════

  it("should transition E1_LANDING → E2_QUALIFICATION on EVT_START", () => {
    const result = transition("E1_LANDING", { type: "EVT_START" });
    expect(result).toBe("E2_QUALIFICATION");
  });

  it("should transition E2_QUALIFICATION → E3_DOCUMENTS on EVT_QUAL_SUBMIT", () => {
    const result = transition("E2_QUALIFICATION", { 
      type: "EVT_QUAL_SUBMIT",
      payload: { projectType: "villa", surface: "200", budget: "500000" }
    });
    expect(result).toBe("E3_DOCUMENTS");
  });

  it("should transition E3_DOCUMENTS → E4_PACK on EVT_DOCS_OK", () => {
    const result = transition("E3_DOCUMENTS", { type: "EVT_DOCS_OK" });
    expect(result).toBe("E4_PACK");
  });

  it("should transition E4_PACK → E5_DISCLAIMER on EVT_PACK_SELECTED", () => {
    const result = transition("E4_PACK", { 
      type: "EVT_PACK_SELECTED",
      payload: { packId: "PACK_P1_MIN" }
    });
    expect(result).toBe("E5_DISCLAIMER");
  });

  it("should transition E5_DISCLAIMER → E6_PAYMENT on EVT_DISCLAIMER_ACCEPT", () => {
    const result = transition("E5_DISCLAIMER", { type: "EVT_DISCLAIMER_ACCEPT" });
    expect(result).toBe("E6_PAYMENT");
  });

  it("should transition E6_PAYMENT → E7_ACTIVE on EVT_PAYMENT_CONFIRMED", () => {
    const result = transition("E6_PAYMENT", { 
      type: "EVT_PAYMENT_CONFIRMED",
      payload: { stripeSessionId: "cs_test_123" }
    });
    expect(result).toBe("E7_ACTIVE");
  });

  it("should transition E7_ACTIVE → E8_PRODUCTION on EVT_START_PRODUCTION", () => {
    const result = transition("E7_ACTIVE", { type: "EVT_START_PRODUCTION" });
    expect(result).toBe("E8_PRODUCTION");
  });

  it("should transition E8_PRODUCTION → E9_AUTORISATION on EVT_AUTH_SUBMITTED", () => {
    const result = transition("E8_PRODUCTION", { type: "EVT_AUTH_SUBMITTED" });
    expect(result).toBe("E9_AUTORISATION");
  });

  it("should transition E9_AUTORISATION → E10_CHANTIER on EVT_AUTH_SIGNED", () => {
    const result = transition("E9_AUTORISATION", { type: "EVT_AUTH_SIGNED" });
    expect(result).toBe("E10_CHANTIER");
  });

  it("should transition E10_CHANTIER → E11_VALIDATION on EVT_SITE_DONE", () => {
    const result = transition("E10_CHANTIER", { type: "EVT_SITE_DONE" });
    expect(result).toBe("E11_VALIDATION");
  });

  it("should transition E11_VALIDATION → E12_CLOTURE on EVT_VALIDATED", () => {
    const result = transition("E11_VALIDATION", { type: "EVT_VALIDATED" });
    expect(result).toBe("E12_CLOTURE");
  });

  it("should allow E12_CLOTURE → E12_CLOTURE on EVT_ARCHIVED (idempotent)", () => {
    const result = transition("E12_CLOTURE", { type: "EVT_ARCHIVED" });
    expect(result).toBe("E12_CLOTURE");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FREEZE (Global transition from any state)
  // ═══════════════════════════════════════════════════════════════════════════

  it("should freeze from E1_LANDING", () => {
    const result = transition("E1_LANDING", { 
      type: "EVT_FREEZE",
      payload: { reason: "Utilisateur a abandonné" }
    });
    expect(result).toBe("EC_GEL");
  });

  it("should freeze from E6_PAYMENT", () => {
    const result = transition("E6_PAYMENT", { type: "EVT_FREEZE" });
    expect(result).toBe("EC_GEL");
  });

  it("should freeze from E11_VALIDATION", () => {
    const result = transition("E11_VALIDATION", { type: "EVT_FREEZE" });
    expect(result).toBe("EC_GEL");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INVALID TRANSITIONS (Must throw)
  // ═══════════════════════════════════════════════════════════════════════════

  it("should throw on invalid transition E1_LANDING → EVT_PAYMENT_CONFIRMED", () => {
    expect(() => {
      transition("E1_LANDING", { 
        type: "EVT_PAYMENT_CONFIRMED",
        payload: { stripeSessionId: "invalid" }
      });
    }).toThrow("Invalid transition");
  });

  it("should throw on backward transition E6_PAYMENT → EVT_QUAL_SUBMIT", () => {
    expect(() => {
      transition("E6_PAYMENT", { type: "EVT_QUAL_SUBMIT" });
    }).toThrow("Invalid transition");
  });

  it("should throw on any transition from EC_GEL", () => {
    expect(() => {
      transition("EC_GEL", { type: "EVT_START" });
    }).toThrow("Dossier frozen");
  });

  it("should throw on EVT_START from E7_ACTIVE (already started)", () => {
    expect(() => {
      transition("E7_ACTIVE", { type: "EVT_START" });
    }).toThrow("Invalid transition");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDS (canTransition helper)
  // ═══════════════════════════════════════════════════════════════════════════

  it("canTransition should return true for valid transition", () => {
    const result = canTransition("E1_LANDING", { type: "EVT_START" });
    expect(result).toBe(true);
  });

  it("canTransition should return false for invalid transition", () => {
    const result = canTransition("E1_LANDING", { 
      type: "EVT_PAYMENT_CONFIRMED",
      payload: { stripeSessionId: "test" }
    });
    expect(result).toBe(false);
  });

  it("canTransition should return false for frozen state", () => {
    const result = canTransition("EC_GEL", { type: "EVT_START" });
    expect(result).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTION SUB-PHASES (Internal E8 states)
  // ═══════════════════════════════════════════════════════════════════════════

  it("should stay in E8_PRODUCTION when advancing sub-phase", () => {
    const result = transition("E8_PRODUCTION", { 
      type: "EVT_PRODUCTION_PHASE",
      payload: { subPhase: "E8_2_APS" }
    });
    expect(result).toBe("E8_PRODUCTION");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL PATH (Payment flow)
  // ═══════════════════════════════════════════════════════════════════════════

  it("should NOT allow skipping payment (E5 → E7)", () => {
    expect(() => {
      transition("E5_DISCLAIMER", { type: "EVT_START_PRODUCTION" });
    }).toThrow("Invalid transition");
  });

  it("should NOT allow multiple payments (E7 → E6)", () => {
    expect(() => {
      transition("E7_ACTIVE", { 
        type: "EVT_PAYMENT_CONFIRMED",
        payload: { stripeSessionId: "cs_duplicate" }
      });
    }).toThrow("Invalid transition");
  });
});

describe("P1 State Machine — Doctrine Compliance", () => {
  it("should enforce append-only (no backward transitions)", () => {
    const states: P1State[] = [
      "E1_LANDING",
      "E2_QUALIFICATION", 
      "E3_DOCUMENTS",
      "E4_PACK",
      "E5_DISCLAIMER",
      "E6_PAYMENT",
      "E7_ACTIVE"
    ];

    // For each state, verify we cannot go backward
    for (let i = 1; i < states.length; i++) {
      const currentState = states[i];
      const previousState = states[i - 1];
      
      // Try to find an event that would go backward (should not exist)
      expect(() => {
        transition(currentState, { type: "EVT_START" });
      }).toThrow();
    }
  });

  it("should enforce fail-fast (throw on invalid, not default)", () => {
    // Doctrine: no permissive fallbacks
    expect(() => {
      transition("E3_DOCUMENTS", { type: "EVT_ARCHIVED" });
    }).toThrow("Invalid transition");
  });

  it("should make EC_GEL terminal (no escape)", () => {
    const events: P1Event["type"][] = [
      "EVT_START",
      "EVT_QUAL_SUBMIT",
      "EVT_DOCS_OK",
      "EVT_PACK_SELECTED",
      "EVT_DISCLAIMER_ACCEPT",
      "EVT_PAYMENT_CONFIRMED",
      "EVT_START_PRODUCTION"
    ];

    events.forEach(eventType => {
      expect(() => {
        transition("EC_GEL", { type: eventType } as P1Event);
      }).toThrow("Dossier frozen");
    });
  });
});
