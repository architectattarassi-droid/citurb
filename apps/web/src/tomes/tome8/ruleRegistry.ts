/**
 * TOME@8 — Registry & traceabilité (web)
 * Mappe RuleID -> impl files/routes.
 * Objectif: qu’une IA / dev navigue directement par RuleID.
 */

export type RuleEntry = {
  ruleId: string;
  title: string;
  source: string;     // ex: docs/DOCTRINE-MASTER.md#...
  ownerTome: number;  // 0..8
  impl: string[];     // chemins fichiers
  routes?: string[];  // routes UI concernées
};

export const RULES: RuleEntry[] = [
  {
    ruleId: "UI-000",
    title: "Front = orchestration, pas de logique métier",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 1,
    impl: ["apps/web/src/tomes/tome1/AppShell.tsx", "apps/web/src/tomes/tome1/AppRouter.tsx"],
  },
  {
    ruleId: "API-000",
    title: "Client API read-only (prototype)",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 4,
    impl: ["apps/web/src/tomes/tome4/apiClient.ts"],
  },
{
  ruleId: "ROUTER-001",
  title: "React Router v6.4+ + routes P1–P6 (Tome-first)",
  source: "docs/DOCTRINE-MASTER.md",
  ownerTome: 1,
  impl: [
    "apps/web/src/tomes/tome1/router/routes.tsx",
    "apps/web/src/tomes/tome1/router/layouts.tsx",
    "apps/web/src/tomes/tome1/AppRouter.tsx"
  ],
  routes: ["/p1","/p2","/p3","/p4","/p5","/p6"]
},
  {
    ruleId: "RBAC-001",
    title: "AuthProvider + capabilities + entitlements (prototype local)",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 5,
    impl: [
      "apps/web/src/tomes/tome5/AuthProvider.tsx",
      "apps/web/src/tomes/tome5/rbac.ts",
      "apps/web/src/tomes/tome5/guards.tsx"
    ],
    routes: ["/login", "/forbidden", "/upgrade"]
  },
  {
    ruleId: "PAYWALL-001",
    title: "Paywall par entitlement feature flag",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 5,
    impl: [
      "apps/web/src/tomes/tome5/guards.tsx",
      "apps/web/src/tomes/tome1/router/routes.tsx"
    ],
    routes: ["/enterprise/api"]
  },
  {
    ruleId: "AUTH-API-001",
    title: "Auth réelle: POST /auth/login + GET /auth/me + JWT storage",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 5,
    impl: [
      "apps/web/src/tomes/tome4/apiClient.ts",
      "apps/web/src/tomes/tome5/AuthProvider.tsx",
      "apps/web/src/tomes/tome5/pages/Login.tsx"
    ],
    routes: ["/login", "/auth/*"]
  },
  {
    ruleId: "RBAC-BE-001",
    title: "RBAC canonique backend: caps + entitlements dans JWT/me",
    source: "docs/DOCTRINE-MASTER.md",
    ownerTome: 5,
    impl: [
      "apps/api/src/tomes/tome-5/auth/rbac.ts",
      "apps/api/src/tomes/tome-5/auth/jwt.strategy.ts",
      "apps/web/src/tomes/tome5/AuthProvider.tsx"
    ],
    routes: ["/auth/me"]
  },
];
