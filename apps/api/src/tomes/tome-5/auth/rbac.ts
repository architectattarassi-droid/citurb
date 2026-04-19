/**
 * TOME@5 — RBAC canonique (backend) aligned with Prisma enum UserRole
 * Doctrine: backend = source de vérité.
 *
 * Schema (prisma/schema.prisma):
 * enum UserRole { CLIENT OPERATOR OPS OWNER ADMIN }
 */

export type BackendRole = "CLIENT" | "OPERATOR" | "OPS" | "OWNER" | "ADMIN";

export type Capability =
  | "dossier:read"
  | "dossier:create"
  | "dossier:submit"
  | "dossier:area:declare"
  | "dossier:area:estimate"
  | "dossier:area:verify"
  | "commission:predict"
  | "data:analytics"
  | "partner:sign"
  | "api:access";

export type Plan = "free" | "pro" | "vvip" | "enterprise";

export type Entitlements = {
  plan: Plan;
  features: Record<string, boolean>;
};

export const ROLE_CAPS: Record<BackendRole, Capability[]> = {
  CLIENT: ["dossier:read", "dossier:create", "dossier:submit", "dossier:area:declare"],
  OPERATOR: ["dossier:read", "dossier:submit", "dossier:area:estimate"],
  OPS: [
    "dossier:read",
    "dossier:area:estimate",
    "commission:predict",
    "data:analytics",
    "api:access",
  ],
  OWNER: [
    "dossier:read",
    "dossier:create",
    "dossier:submit",
    "dossier:area:declare",
    "dossier:area:estimate",
    "dossier:area:verify",
    "commission:predict",
    "data:analytics",
    "partner:sign",
    "api:access",
  ],
  ADMIN: [
    "dossier:read",
    "dossier:create",
    "dossier:submit",
    "dossier:area:declare",
    "dossier:area:estimate",
    "dossier:area:verify",
    "commission:predict",
    "data:analytics",
    "partner:sign",
    "api:access",
  ],
};

export function entitlementsFor(role: BackendRole): Entitlements {
  const plan: Plan = role === "OWNER" || role === "ADMIN" || role === "OPS" ? "enterprise" : "pro";
  return {
    plan,
    features: {
      P1_ENABLED: true,
      P2_ENABLED: true,
      P3_ENABLED: true,
      P4_ENABLED: true,
      P5_ENABLED: true,
      P6_ENABLED: true,
      API_ENABLED: plan === "enterprise",
    },
  };
}

export function capsFor(role: BackendRole): Capability[] {
  return ROLE_CAPS[role] ?? [];
}
