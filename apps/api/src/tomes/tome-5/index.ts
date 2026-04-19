/**
 * Tome 5 — Auth / RBAC (JWT, caps, rôles, entitlements)
 * Barrel d'export canonique.
 */
export { Tome5Module } from "./tome-5.module";
export { AuthService } from "./auth/auth.service";
export { capsFor, entitlementsFor } from "./auth/rbac";
export type { BackendRole, Capability, Plan } from "./auth/rbac";
