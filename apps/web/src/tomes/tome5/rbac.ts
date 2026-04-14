/**
 * TOME@5 — RBAC / Capabilities / Entitlements (web)
 * Doctrine: le backend reste source de vérité ; le front applique une orchestration/guard.
 * ITER2: impl locale (prototype) pour valider l'architecture.
 */

export type Role =
  | "public"
  | "client"
  | "investor"
  | "promoter"
  | "architect_partner"
  | "institutional"
  | "admin";

export type Capability =
  | "dossier:read"
  | "dossier:create"
  | "dossier:submit"
  | "commission:predict"
  | "data:analytics"
  | "partner:sign"
  | "api:access";

export const ROLE_CAPS: Record<Role, Capability[]> = {
  public: [],
  client: ["dossier:read", "dossier:create"],
  investor: ["dossier:read", "commission:predict", "data:analytics"],
  promoter: ["dossier:read", "dossier:submit"],
  architect_partner: ["dossier:read", "partner:sign"],
  institutional: ["dossier:read", "data:analytics"],
  admin: ["dossier:read", "dossier:create", "dossier:submit", "commission:predict", "data:analytics", "partner:sign", "api:access"],
};

export type Plan = "free" | "pro" | "vvip" | "enterprise";

export type Entitlements = {
  plan: Plan;
  features: Record<string, boolean>;
};

export const DEFAULT_ENTITLEMENTS: Entitlements = {
  plan: "free",
  features: {
    P1_ENABLED: true,
    P2_ENABLED: true,
    P3_ENABLED: true,
    P4_ENABLED: true,
    P5_ENABLED: true,
    P6_ENABLED: true,
    API_ENABLED: false, // paywall
  },
};

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function computeCaps(roles: Role[]): Capability[] {
  return uniq(roles.flatMap((r) => ROLE_CAPS[r] ?? []));
}

/**
 * Backend roles (Prisma / API) -> Web roles
 * NOTE: aligner finement en ITER6 avec le modèle RBAC canonique backend.
 */
export type BackendRole = string;

export function mapBackendRole(role: BackendRole): Role[] {
  // Minimal mapping for now (OWNER = admin)
  if (role === "OWNER" || role === "ADMIN") return ["admin"];
  if (role === "INVESTOR") return ["investor"];
  if (role === "PROMOTER") return ["promoter"];
  if (role === "PARTNER") return ["architect_partner"];
  if (role === "INSTITUTIONAL") return ["institutional"];
  // default: client
  return ["client"];
}
