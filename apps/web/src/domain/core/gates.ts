/**
 * CITURBAREA — Domain — Gates
 *
 * Doctrine: every "porte" is a first-class domain concept.
 * UI must NOT hardcode gate rules.
 */

export type GateId =
  | "P1_PARTICULIER"
  | "P2_RENTABLE"
  | "P3_CLE_EN_MAIN"
  | "P4_CAPITAL"
  | "P5_RAPPORTS"
  | "P6_PARTENAIRES";

export type FeatureFlag =
  | "P1_ENABLED"
  | "P2_ENABLED"
  | "P3_ENABLED"
  | "P4_ENABLED"
  | "P5_ENABLED"
  | "P6_ENABLED"
  | "API_ENABLED";

export interface GateDef {
  id: GateId;
  label: string;
  /** Feature flag controlling the gate activation. */
  feature?: FeatureFlag;
  /** Capability strings follow existing RBAC schema (tome5/rbac). */
  caps?: string[];
}

export const GATES: Record<GateId, GateDef> = {
  P1_PARTICULIER: {
    id: "P1_PARTICULIER",
    label: "Porte 1 — Personnel",
    feature: "P1_ENABLED",
  },
  P2_RENTABLE: {
    id: "P2_RENTABLE",
    label: "Porte 2 — Projet rentable",
    feature: "P2_ENABLED",
    caps: ["commission:predict"],
  },
  P3_CLE_EN_MAIN: {
    id: "P3_CLE_EN_MAIN",
    label: "Porte 3 — Clé en main",
    feature: "P3_ENABLED",
    caps: ["dossier:submit"],
  },
  P4_CAPITAL: {
    id: "P4_CAPITAL",
    label: "Porte 4 — Capital",
    feature: "P4_ENABLED",
    caps: ["data:analytics"],
  },
  P5_RAPPORTS: {
    id: "P5_RAPPORTS",
    label: "Porte 5 — Rapports",
    feature: "P5_ENABLED",
    caps: ["partner:sign"],
  },
  P6_PARTENAIRES: {
    id: "P6_PARTENAIRES",
    label: "Porte 6 — Partenaires",
    feature: "P6_ENABLED",
    caps: ["data:analytics"],
  },
};
