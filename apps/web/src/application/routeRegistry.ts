/**
 * CITURBAREA — Application — Route Registry (V152-B1)
 *
 * BLOC 1 doctrine:
 * - Routes cibles uniques (canon): /, /login, /p1, /p1/packs, /p1/dossier, /_dev/routes
 * - Tout le reste: supprimé OU redirect interne vers canon (pas de page orpheline)
 * - Objectif audit: 0 UNKNOWN / 0 ORPHAN
 */

import type { GateId } from "../domain/core/gates";

export type RouteVisibility = "public" | "auth";

export interface RouteDef {
  path: string;
  label: string;
  visibility: RouteVisibility;
  /** Optional gate binding for portal navigation + future guards. */
  gate?: GateId;
  /** If true, show in sidebar navigation. */
  nav?: boolean;
  /** Optional grouping for nav. */
  group?: "MEDIA" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "DEV";
  /** If set, this route is an alias and should redirect to this target. */
  redirectTo?: string;
}

/** Canon routes — ONLY targets that should remain "real" pages. */
export const CANON = {
  HOME: "/",
  LOGIN: "/login",
  P1: "/p1",
  P1_PACKS: "/p1/packs",
  P1_DOSSIER: "/p1/dossier",
  DEV_ROUTES: "/_dev/routes",
} as const;

/**
 * Redirect aliases (legacy). Keep exhaustive enough to eliminate UNKNOWN usages.
 * NOTE: these are not "targets" — they must redirect to canon.
 */
export const REDIRECTS: RouteDef[] = [
  // Auth legacy
  { path: "/auth/login", label: "Connexion (alias)", visibility: "public", nav: false, redirectTo: CANON.LOGIN },
  { path: "/auth/signup", label: "Créer un compte (alias)", visibility: "public", nav: false, redirectTo: CANON.LOGIN },

  // P1 legacy / extra pages → canon funnel
  { path: "/p1/config", label: "P1 — Config (alias)", visibility: "public", nav: false, redirectTo: CANON.P1 },
  { path: "/p1/confirmation", label: "P1 — Confirmation (alias)", visibility: "public", nav: false, redirectTo: CANON.P1_PACKS },
  { path: "/p1/qualification", label: "P1 — Qualification (alias)", visibility: "public", nav: false, redirectTo: CANON.P1 },
  { path: "/p1/qualify", label: "P1 — Qualify (alias)", visibility: "public", nav: false, redirectTo: CANON.P1 },
  { path: "/p1/offres", label: "P1 — Offres (alias)", visibility: "public", nav: false, redirectTo: CANON.P1 },
  { path: "/p1/packs-personnalise", label: "P1 — Packs personnalisés (alias)", visibility: "public", nav: false, redirectTo: CANON.P1_PACKS },

  // Old portals / zones (temp: funnel first) → landing
  { path: "/media", label: "Médias (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p2", label: "P2 (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p2/form", label: "P2 form (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p2/result", label: "P2 result (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p3", label: "P3 (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p4", label: "P4 (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p5", label: "P5 (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/p6", label: "P6 (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/enterprise/api", label: "Enterprise API (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },

  // Misc legacy public pages
  { path: "/forbidden", label: "Accès refusé (alias)", visibility: "public", nav: false, redirectTo: CANON.LOGIN },
  { path: "/upgrade", label: "Upgrade (alias)", visibility: "public", nav: false, redirectTo: CANON.HOME },
  { path: "/faq", label: "FAQ (alias)", visibility: "public", nav: false, redirectTo: CANON.P1 },
];

/** Route list used by DevRoutesPage and audit generator. */
export const ROUTES: RouteDef[] = [
  // Canon targets
  { path: "/", label: "Landing", visibility: "public", nav: false },
  { path: "/login", label: "Connexion", visibility: "public", nav: false },

  // P1 canon funnel
  { path: "/p1", label: "P1 — Accueil", visibility: "public", gate: "P1_PARTICULIER", nav: true, group: "P1" },
  { path: "/p1/packs", label: "P1 — Packs", visibility: "public", gate: "P1_PARTICULIER", nav: true, group: "P1" },
  { path: "/p1/dossier", label: "P1 — Dossier", visibility: "public", gate: "P1_PARTICULIER", nav: true, group: "P1" },

  // Dev diagnostics
  { path: "/_dev/routes", label: "DEV — Routes", visibility: "public", nav: false, group: "DEV" },

  // Redirect aliases
  ...REDIRECTS,
];

export const NAV_ROUTES = ROUTES.filter(r => r.nav);
